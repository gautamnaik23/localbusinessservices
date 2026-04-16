// src/utils/ids.js
// Utility functions for generating IDs and time differences
import { DateTime } from 'luxon';

export function generateSessionId() {
  // Format: MMDDYY (e.g., 04092026 for April 9th, 2026)
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${year}${month}${day}`;
}

export function generateHourDifference(apptDateStr, apptTime) {
  const now = DateTime.now().setZone('America/Los_Angeles');

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
  return apptDate.diff(now, 'hours').hours;
}