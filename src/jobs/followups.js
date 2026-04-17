// src/jobs/followups.js
import { io } from '../server.js';  // ✅ WebSocket push!
import cron from 'node-cron';
import { getSheetsClient } from '../services/sheets.js';
import { senders } from '../services/outbound.js';  // Router imports all senders
import { generateFollowUp } from '../services/ai.js';
import { getThreadHistory } from '../services/messages.js';
import { getBusinessConfig } from '../services/business.js';
import { generateHourDifference, splitDateTime } from '../utils/ids.js';

const SHEET_ID = '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM'
const MESSAGES_TAB = 'Conversation History';

export function startFollowUpJob() {
  //cron.schedule('*/10 * * * *', async () => {  // Every 10min for real implementation
  cron.schedule('* * * * *', async () => { //every 1 minute
    console.log('🔔 Checking follow-ups...');
    const sheets = await getSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${MESSAGES_TAB}!A:I`  // Include channel col I
    });
    
    const rows = response.data.values || [];
    
    // Group by threadId → check LATEST replyNeeded/followUp pair
    const threadStates = {};
    const seen = new Set();
    for (const row of rows.slice().reverse()) {  // Newest first
      console.log("This is the date/time: " + row[4]);
      console.log("This is the message: " + row[3]);
      const threadId = row[0];
      if (threadId == "") {
        continue;
      }
      if (!threadStates[threadId] && !seen.has(threadId)) {
        const replyNeeded = row[5] === 'TRUE';
        const followUp = row[6] === 'FALSE';
        const { datePart, timePart } = splitDateTime(row[4]);
        //console.log("This is the datePart:" + datePart + " And this is the time Part: " + timePart + " The original is: " + row[4]);
        if (!datePart || !timePart) {
          console.log('❌ Bad timestamp row:', row[4]);
          continue;
        }
        const hoursSilence = generateHourDifference(datePart, timePart);
    
        if (replyNeeded && followUp && hoursSilence > 0.1) {
            threadStates[threadId] = {
              threadId, 
              businessId: row[7], 
              channel: row[8], 
              rowIndex: rows.indexOf(row),
              timestamp: row[4], 
              sessionId: row[1]
            };
        }
        }
        seen.add(threadId);
        console.log(seen);
    }
    
    const staleThreadsList = Object.values(threadStates);
    console.log(`📤 ${staleThreadsList.length} follow-ups queued`);
    
    // In follow-up job, REPLACE nudge logic:
    for (const thread of staleThreadsList) {
        // 1. Load thread history
        const history = await getThreadHistory(thread.businessId, thread.threadId, thread.sessionId);
        
        // 2. Get business config
        const business = await getBusinessConfig(thread.businessId);
        
        // 3. AI generates personalized nudge
        const nudgeMsg = await generateFollowUp(history, business);
  
        // 4. Send via channel
        const success = await senders[thread.channel]?.(thread.threadId, nudgeMsg);
  
        if (success) {
            await markFollowUpSent(sheets, thread.rowIndex);
            // 🚀 PUSH TO Route (real-time!)
            io.to(thread.threadId).emit('nudge', { message: nudgeMsg });
            console.log(`✅ AI nudge sent: ${thread.channel}/${thread.threadId}`);
  }
}
  });
}

async function markFollowUpSent(sheets, rowIndex) {
  // Update row G (followUp) = "true"
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${MESSAGES_TAB}!G${rowIndex + 1}`,  // +1 for 1-based rows
    valueInputOption: 'USER_ENTERED',
    resource: { values: [['TRUE']] }
  });
}

