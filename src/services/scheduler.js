// src/scheduler.js - Runs time-based jobs
import cron from 'node-cron';
import { io } from '../server.js';  // Your socket.io instance
import checkAllReminders from '../services/reminders.js';
import { senders } from './outbound.js';
import checkAllReviews from './reviews.js';


export async function sendNudge(threadId, data, channel) {
  switch (channel) {
    case 'widget':
      io.to(threadId).emit('nudge', data);  // Your widget
      break;
    case 'telegram':
      // Telegram API call
      await senders.telegram(threadId, data.message);
      break;
    case 'sms':
      // SMS API (Twilio)
      await sendSMS(phoneNumber, data.message);
      break;
    default:
      console.log(`❌ Unknown channel: ${channel}`);
  }
  console.log(`📱 ${channel} nudge → ${threadId}`);
}

// Every 10 minute
cron.schedule('*/10 * * * *', () => {
  console.log('🕐 Running reminders...');
  checkAllReminders();
});

//Sending out Review Requests
cron.schedule('0 * * * *', () => {
  checkAllReviews();
});

export default null;  // Just runs
