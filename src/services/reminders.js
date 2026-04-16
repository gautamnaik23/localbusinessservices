// src/services/reminders.js
// Polls Appointments tab every 2h, sends 24h/2h reminders via nudge.
// Updates flags when sent.

import { getSheetsClient } from './sheets.js';
import { sendNudge } from './scheduler.js';  // From scheduler.js
import { DateTime } from 'luxon';

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
  const now = DateTime.now().setZone('America/Los_Angeles');
  
  console.log(`📅 Checking ${rows.length} appts...`);
  
  for (const [rowIdx, row] of rows.entries()) {
    const businessId = row[CONFIG.cols.businessId];
    if (!businessId) continue;
    
    const apptDateStr = row[CONFIG.cols.apptDate];
    const apptTime = row[CONFIG.cols.apptTime];
    const threadId = row[CONFIG.cols.threadId];
    const channel = row[CONFIG.cols.channel];
    
    // 1️⃣ Parse MM/DD/YYYY date
    const dateParts = apptDateStr.split('/');  // ["04", "16", "2026"]
    const year = parseInt(dateParts[2]);
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);

    // 2️⃣ Parse 1:00 AM time
    const timeMatch = apptTime.match(/(\d+):(\d{2})\s*(AM|PM)?/i);
    
    const [, hourStr, minStr, ampm] = timeMatch;
    let hour24 = parseInt(hourStr);
    const mins = parseInt(minStr);

    if (ampm?.toUpperCase() === 'PM' && hour24 < 12) hour24 += 12;
    if (ampm?.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

    // 1️⃣ Parse date + time (handles AM/PM automatically!)
    const apptDate = DateTime.fromObject(
      { 
    year, month, day, 
    hour: hour24, 
    minute: mins, 
    second: 0 
    },
    { zone: 'America/Los_Angeles' }  // Your local timezone
    );

    // 3️⃣ Calculate difference
    const diffHours = apptDate.diff(now, 'hours').hours;


/*    const fullAppt = new Date(apptDate);
    fullAppt.setHours(
      parseInt(apptTime.split(':')[0]),
      parseInt(apptTime.split(':')[1].slice(0, 2)),
      0, 0
    );
    
    const diffMs = fullAppt - now;*/
    console.log(apptDate + ": " + apptTime + " is " + diffHours + " away." );
    const twoHours = 2 * 60 * 60 * 1000;
    const twofourHours = 24 * 60 * 60 * 1000;

    // 2h reminder
    const sent2h = row[CONFIG.cols.reminder2h] === 'TRUE';
    if (!sent2h && diffHours > 0 && diffHours <= 2) {
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
    if (!sent24h && diffHours > 2 && diffHours <= 24) {
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