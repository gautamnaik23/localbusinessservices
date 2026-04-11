// src/jobs/followups.js
import cron from 'node-cron';
import { getSheetsClient } from '../services/sheets.js';

const SHEET_ID = process.env.GOOGLESHEETID;
const MESSAGES_TAB = 'Sheet1';

export function startFollowUpJob() {
  // Every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    console.log('🔔 Checking follow-ups...');
    const sheets = await getSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${MESSAGES_TAB}!A:H`
    });
    
    const rows = response.data.values || [];
    const now = new Date();
    
    // Find stale conversations: replyNeeded=true, followUp=false, >2h silence
    const staleThreads = [];
    const seenThreads = new Set();
    
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const [threadId, , , , timestamp, replyNeeded, followUp, businessId] = row;
      
      if (seenThreads.has(threadId)) continue;
      
      if (replyNeeded === 'true' && followUp === 'false') {
        const lastMsgTime = new Date(timestamp);
        const hoursSilence = (now - lastMsgTime) / (1000 * 60 * 60);
        
        if (hoursSilence > 2) {
          staleThreads.push({ threadId, businessId, lastMsgTime });
          seenThreads.add(threadId);
        }
      }
    }
    
    console.log(`📤 ${staleThreads.length} follow-ups queued`);
    
    // TODO: Send nudge (widget/email/SMS) for each
    for (const thread of staleThreads) {
      // Send: "Hey, still interested? Here's the booking: [link]"
      console.log(`Follow-up: ${thread.threadId} (${thread.businessId})`);
      
      // Mark as sent: Update Sheet row G= true
      // await markFollowUpSent(threadId);
    }
  });
}
