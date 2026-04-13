// src/scheduler.js - Runs time-based jobs
import cron from 'node-cron';
import { io } from '../server.js';  // Your socket.io instance
import checkAllReminders from '../services/reminders.js';
//import checkReviews from './services/reviews.js';  // Later


export async function sendNudge(threadId, data, channel) {
  switch (channel) {
    case 'widget':
      io.to(threadId).emit('nudge', data);  // Your widget
      break;
    case 'telegram':
      // Telegram API call
      await sendTelegramMessage(threadId, data.message);
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

// Every 2h
cron.schedule('* * * * *', () => {
  console.log('🕐 Running reminders...');
  checkAllReminders();
});

// Every day at 6PM (post-appt reviews)
//cron.schedule('0 18 * * *', () => {
//  console.log('⭐ Running reviews...');
//  checkReviews();
//});

export default null;  // Just runs
