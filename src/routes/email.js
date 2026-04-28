// src/routes/email.js
import { Router } from 'express';
import { getBusinessConfig } from '../services/business.js';
import { getThreadHistory, saveMessagesBatch } from '../services/messages.js';
import { generateReply } from '../services/ai.js';
import { senders } from '../services/outbound.js';
import { generateSessionId } from '../utils/ids.js';
import { getBusinessFromChannelBot } from '../services/sheets.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { 
      receiver_email,      // Your business email receiving the message
      customer_email,            // Customer email (threadId)
      subject,          // Original subject line  
      message,          // Email body
      sender_name,      // Optional: "John Doe <john@example.com>"
      from_header       // Raw From: header for business matching
    } = req.body;

    // Auto-detect business_id from sender domain if missing
    const businessInfo = await getBusinessFromChannelBot('email', receiver_email);
    const businessid = businessInfo?.businessId || detectBusinessFromEmail(from_header);
    const senderRefreshToken = businessInfo?.token;
    if (!businessid) businessid = 'demo_business';  // Fallback
    const sessionId = generateSessionId();
    const threadId = customer_email;  // Use customer email as stable thread identifier

    console.log(`📧 Email [${businessid}]: ${customer_email} → "${message.slice(0,50)}"`);

    // 1. Load business config FIRST
    const business = await getBusinessConfig(businessid);

    // 3. Load conversation history (EXCLUDES current message)
    const history = await getThreadHistory(businessid, threadId, sessionId);

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

export default router;