// src/services/reviews.js
// Scans completed appointments, sends review requests 24h after appt time
// Updates reviewSent flag when sent

import { getSheetsClient } from './sheets.js';
import { senders } from './outbound.js';
import { getBusinessConfig } from './business.js';
import { generateHourDifference } from '../utils/ids.js';

const CONFIG = {
  tabName: 'AppointmentFakeTable',  // Same as reminders
  cols: {  // 0-indexed - match your sheet
    businessId: 6,     // G (businessid)
    threadId: 0,       // A (chatId)
    channel: 7,        // H
    apptDate: 1,       // B (MM/DD/YYYY)  
    apptTime: 2,       // C ("2:00 PM")
    reviewSent: 5      // F (TRUE/FALSE)
  }
};

export async function checkAllReviews() {
  const sheets = await getSheetsClient();
  const range = `${CONFIG.tabName}!A:H`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM',
    range
  });
  
  const rows = res.data.values?.slice(1) || [];  // Skip header
  const now = new Date();
  
  console.log(`⭐ Checking ${rows.length} appts for reviews...`);
  
  for (const [rowIdx, row] of rows.entries()) {
    const businessId = row[CONFIG.cols.businessId];
    if (!businessId) continue;
    
    const reviewSent = row[CONFIG.cols.reviewSent] === 'TRUE';
    if (reviewSent) continue;  // Already sent
    
    const apptDateStr = row[CONFIG.cols.apptDate];
    const apptTime = row[CONFIG.cols.apptTime];
    const threadId = row[CONFIG.cols.threadId];
    const channel = row[CONFIG.cols.channel];
    
    
    const business = getBusinessConfig(businessId);

    // Send review 2h AFTER appointment
    const hoursSinceAppt = -generateHourDifference(apptDateStr, apptTime); //This figures out now - appTime so looking at negative values
    if (hoursSinceAppt <= -2) {
      const reviewMsg = `Hi! We hope you had a great experience today 😊 If you have a moment, we’d really appreciate it if you could leave us a quick review. It helps us a lot! ${business.reviewLink || ""}`;
      
      try {
        await senders.send(channel, threadId, reviewMsg);
        await markReviewSent(sheets, rowIdx, CONFIG.cols.reviewSent);
        console.log(`⭐ Review request → ${threadId} (${channel})`);
      } catch (err) {
        console.error(`Review send failed for ${threadId}:`, err);
      }
    }
  }
}

async function markReviewSent(sheets, rowIdx, colIndex) {
  const range = `${CONFIG.tabName}!${String.fromCharCode(65 + colIndex)}${rowIdx + 2}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM',
    range,
    valueInputOption: 'RAW',
    resource: { values: [['TRUE']] }
  });
}

function parseDate(dateStr) {
  const [month, day, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

export default checkAllReviews;