// src/routes/email.js
import { Router } from 'express';
import { getBusinessConfig } from '../services/business.js';
import { getThreadHistory, saveMessagesBatch } from '../services/messages.js';
import { generateReply } from '../services/ai.js';
import { senders } from '../services/outbound.js';
import { generateSessionId } from '../utils/ids.js';
import { getBusinessFromChannelBot } from '../services/sheets.js';
import { startGmailWatch, getGmailHistory, getGmailMessage } from "../services/gmail.js";

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { 
      receiver_email,      // Your business email receiving the message
      customer_email,            // Customer email (threadId)
      subject,          // Original subject line  
      message,          // Email body
      sender_name,      // Optional: "John Doe <john@example.com>"
      from_header,       // Raw From: header for business matching
      thread_id         // Real Gmail thread ID if available (optional, can use customer_email as fallback)
    } = req.body;

    // Auto-detect business_id from sender domain if missing
    const businessInfo = await getBusinessFromChannelBot('email', receiver_email);
    let businessid = businessInfo?.businessId || detectBusinessFromEmail(from_header);
    const senderRefreshToken = businessInfo?.token;
    if (!businessid) businessid = 'demo_business';  // Fallback
    const sessionId = generateSessionId();
    console.log('Detected thread_id:', thread_id);
    const threadId = thread_id || customer_email;  // Real Gmail thread ID if available (optional, can use customer_email as fallback)

    console.log(`📧 Email [${businessid}]: ${customer_email} → "${message.slice(0,50)}"`);

    // 1. Load business config FIRST
    const business = await getBusinessConfig(businessid);
    console.log(business);

    // ===============================
    // AUTO START GMAIL WATCH (if not already active)
    // ===============================
    try {
    await startGmailWatch({
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: senderRefreshToken
    });

    console.log("📡 Gmail watch ensured for:", businessid);
    } catch (err) {
    console.error("⚠️ Gmail watch failed:", err.message);
    }

    // 3. Load conversation history (EXCLUDES current message). use threadId for email to keep history together
    const history = await getThreadHistory(businessid, threadId, threadId);

    // 4. Generate real AI reply using your prompt
    const aiResponse = await generateReply({
      business,
      history, 
      userMessage: message
    });

    //Save user and AI messages
    await saveMessagesBatch(businessid, threadId, [
    {role: 'user', text: message, replyNeeded: false, followUp: false},
    {role: 'ai', text: aiResponse.message, replyNeeded: aiResponse.expecting_reply, followUp: false}
    ], 'email');

    // Send reply back via email
    await senders.email(customer_email, receiver_email, aiResponse.message, business, senderRefreshToken);

    res.json({ 
      ok: true, 
      business_id: businessid,
      thread_id: threadId,
      reply: aiResponse.message 
    });

  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({ error: 'Failed to process email' });
  }
});

// Simple business detection from email domain
function detectBusinessFromEmail(fromHeader) {
  const domainMap = {
    'clinicA.com': 'clinic_a',
    'spaB.net': 'spa_b',
    // Add client domains → business_ids
  };
  const domain = fromHeader?.match(/@([^>\s]+)/)?.[1];
  return domainMap[domain] || 'demo_business';
}

// ===============================
// GMAIL PUSH WEBHOOK (INBOUND)
// ===============================
router.post('/gmail-push', async (req, res) => {
  try {
    // This endpoint receives Gmail push notifications for new emails in connected business inboxes.
    const pubsubMessage = req.body.message;

    if (!pubsubMessage?.data) {
      return res.status(200).send('No data');
    }

    // Decode Pub/Sub payload
    const decoded = JSON.parse(
      Buffer.from(pubsubMessage.data, 'base64').toString()
    );

    console.log('📩 Gmail Push:', decoded);

    // Extract relevant info from the decoded message
    const emailAddress = decoded.emailAddress;
    const historyId = decoded.historyId;

    // Lookup business by connected Gmail
    const businessInfo = await getBusinessFromChannelBot(
      'email',
      emailAddress
    );

    if (!businessInfo) {
      console.log('⚠️ No business found for email:', emailAddress);
      return res.status(200).send('No business');
    }

    const businessid = businessInfo.businessId;
    const refreshToken = businessInfo.token;

    // Fetch Gmail history changes
    const history = await getGmailHistory({
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken,
      startHistoryId: historyId
    });

    console.log(`📜 Gmail history entries: ${history.length}`);

    // Process each new email in the history
    for (const entry of history) {
      const messages = entry.messages || [];

      for (const msg of messages) {
        // Fetch full message
        const fullMessage = await getGmailMessage({
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken,
          messageId: msg.id
        });
        // Extract email details
        const headers = fullMessage.payload.headers;

        const from =
          headers.find(h => h.name === 'From')?.value || '';

        const subject =
          headers.find(h => h.name === 'Subject')?.value || '';

        const threadId = fullMessage.threadId;

        // Extract sender email
        const customer_email =
          from.match(/<(.+?)>/)?.[1] ||
          from;

        // Skip self-sent emails
        if (customer_email === emailAddress) {
          continue;
        }

        // Extract email body
        let body = '';

        if (fullMessage.payload.parts) {
          const textPart = fullMessage.payload.parts.find(
            p => p.mimeType === 'text/plain'
          );

          if (textPart?.body?.data) {
            body = Buffer.from(
              textPart.body.data,
              'base64'
            ).toString();
          }
        }

        if (!body && fullMessage.payload.body?.data) {
          body = Buffer.from(
            fullMessage.payload.body.data,
            'base64'
          ).toString();
        }

        console.log(`📧 New inbound email from ${customer_email}`);
        console.log(`🧵 Thread: ${threadId}`);

        // =========================================
        // MY EXISTING AI FLOW
        // =========================================

        //const sessionId = generateSessionId();

        const priorHistory = await getThreadHistory(
          businessid,
          threadId,
          threadId  // For email, use threadId as sessionId to keep history together
        );

        const aiResponse = await generateReply({
          business,
          history: priorHistory,
          userMessage: body
        });

        // Save messages
        await saveMessagesBatch(businessid, threadId,
          [{role: 'user', text: body, replyNeeded: false, followUp: false},
            {role: 'ai', text: aiResponse.message, replyNeeded: aiResponse.expecting_reply, followUp: false}],
          'email'
        );

        // Send AI reply
        await senders.email(
          customer_email,
          emailAddress,
          aiResponse.message,
          business,
          refreshToken
        );

        console.log('✅ AI email reply sent');
      }
    }

    res.status(200).send('ok');

  } catch (error) {
    console.error('Gmail push error:', error);
    res.status(500).send('error');
  }}
);

export default router;