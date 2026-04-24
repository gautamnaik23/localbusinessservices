// src/scheduler.js - Runs time-based jobs
import cron from 'node-cron';
import { io } from '../server.js';  // Your socket.io instance
import checkAllReminders from '../services/reminders.js';
import { senders } from './outbound.js';
import checkAllReviews from './reviews.js';

// Every 10 minute
//cron.schedule('* * * * *', () => {
cron.schedule('*/10 * * * *', () => {
  console.log('🕐 Running reminders...');
  checkAllReminders();
});

//Sending out Review Requests
cron.schedule('*/10 * * * *', () => {
  checkAllReviews();
});

export default null;  // Just runs
