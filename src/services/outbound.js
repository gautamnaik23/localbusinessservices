// src/senders/router.js
// Universal sender router: channel → sender function

export const senders = {
  widget: async (threadId, message) => {
    // Widget push (WebSocket or HTTP)
    console.log(`Widget nudge: ${threadId} → ${message}`);
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
  sms: async (phone, message) => {
    // Twilio/Resend/etc (add API key to .env)
    console.log(`SMS nudge: ${phone} → ${message}`);
    return true;  // TODO: Real SMS
  },
  // Add email, form, etc.
};

senders.send = (channel, threadId, message) => senders[channel]?.(threadId, message);
