// src/senders/router.js
// Universal sender router: channel → sender function

import { io } from '../server.js'; 
import { sendGmailEmail } from '../routes/gmail.js';

export const senders = {
  widget: async (threadId, message, sender) => {
    // Widget push (WebSocket or HTTP)
    const nudgeId = `nudge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log(`🚀 EMIT NUDGE [${nudgeId}]: ${threadId} → ${message.slice(0,50)}`);
    console.log(`Widget nudge: ${threadId} → ${message}`);
    io.to(threadId).emit('nudge', { message });
    return true;
  },
  telegram: async (chatId, message, sender) => {
    // Telegram Bot API
    await fetch(`https://api.telegram.org/bot${sender}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    return true;
  },
  email: async (customeremailAddress, businessEmailAddress, message, business, senderRefreshToken) => {
    console.log(`📧 Email reply: ${customeremailAddress} → ${message.slice(0,50)}`);
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;

    // Send the reply using the business's connected Gmail account.
    await sendGmailEmail({
      to: customeremailAddress,
      subject: 'Re: Your inquiry',
      html: `
        <p>${message}</p>
        <hr>
        <small>
          ${business.businessName}<br>
          ${business.phoneNumber || ''}<br>
          <a href="${business.bookingLink || '#'}">Book Now</a>
        </small>
      `,
      businessName: business.businessName,
      businessEmail: businessEmailAddress,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: senderRefreshToken
    });
    return true;
  },
  sms: async (phone, message) => {
    // Twilio/Resend/etc (add API key to .env)
    console.log(`SMS nudge: ${phone} → ${message}`);
    return true;  // TODO: Real SMS
  },
  // Add email, form, etc.
};

senders.send = (channel, threadId, message, sender) => senders[channel]?.(threadId, message, sender);
