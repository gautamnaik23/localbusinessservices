// src/services/reminders.js
// Polls Appointments tab every 2h, sends 24h/2h reminders via nudge.
// Updates flags when sent.

import { getSheetsClient } from './sheets.js';
import { sendNudge } from './scheduler.js';  // From scheduler.js

const CONFIG = {
  tabName: 'AppointmentFakeTable',
  cols: {  // 0-indexed
    businessId: 6,     // H
    threadId: 0,       // A  
    apptDate: 1,       // C (MM/DD/YYYY)
    apptTime: 2,       // D ("2:00 PM")
    reminder24h: 3,    // E (TRUE/FALSE)
    reminder2h: 4,     // F
    reviewSent: 5,      // G
    channel: 7
  }
};

export async function checkAllReminders() {
  const sheets = await getSheetsClient();
  const range = `${CONFIG.tabName}!A:H`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM',
    range
  });
  
  const rows = res.data.values?.slice(1) || [];  // Skip header
  const now = new Date();
  
  console.log(`📅 Checking ${rows.length} appts...`);
  
  for (const [rowIdx, row] of rows.entries()) {
    const businessId = row[CONFIG.cols.businessId];
    if (!businessId) continue;
    
    const apptDateStr = row[CONFIG.cols.apptDate];
    const apptTime = row[CONFIG.cols.apptTime];
    const threadId = row[CONFIG.cols.threadId];
    const channel = row[CONFIG.cols.channel];
    
    const apptDate = parseDate(apptDateStr);
    if (!apptDate || isNaN(apptDate)) continue;
    
    const fullAppt = new Date(apptDate);
    fullAppt.setHours(
      parseInt(apptTime.split(':')[0]),
      parseInt(apptTime.split(':')[1].slice(0, 2)),
      0, 0
    );
    
    const diffMs = fullAppt - now;
    const hoursSilence = diffMs / 60 / 60 / 1000
    console.log(apptDate + ": " + apptTime + " is " + diffMs / (60 * 60 * 1000) + " away." );
    console.log(hoursSilence);

    // 2h reminder
    const sent2h = row[CONFIG.cols.reminder2h] === 'TRUE';
    if (!sent2h && diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000) {
      console.log("sending 2hr reminder for " + apptDateStr + " " + apptTime);
      await sendNudge(threadId, {
        message: 'Just a quick reminder — your appointment today at ' + apptTime +  ' is coming up soon. See you shortly 😊'
      }, channel);
      await markSent(sheets, rowIdx, CONFIG.cols.reminder2h);
      await markSent(sheets, rowIdx, CONFIG.cols.reminder24h);
      continue
    }

    // 24h reminder
    const sent24h = row[CONFIG.cols.reminder24h] === 'TRUE';
    if (!sent24h && diffMs > 2 && diffMs <= 24 * 60 * 60 * 1000) {
      console.log("sending 24hr reminder for " + apptDateStr + " " + apptTime + "    " + diffMs);
      await sendNudge(threadId, {
        message: 'Hi! Just a reminder that you have an appointment scheduled for ' + apptTime + ' on ' + apptDateStr + ' . Let us know if you need to reschedule!'
      }, channel);
      await markSent(sheets, rowIdx, CONFIG.cols.reminder24h);  // Pass rowIdx
    }
    
  }
}

async function markSent(sheets, rowIdx, colIndex) {
  const range = `${CONFIG.tabName}!${String.fromCharCode(65 + colIndex)}${rowIdx + 2}`;  // +2 = header + 1-index
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

// Export for scheduler
export default checkAllReminders;