// src/jobs/followups.js
import cron from 'node-cron';
import { getSheetsClient } from '../services/sheets.js';
import { senders } from '../services/outbound.js';  // Router imports all senders
import { generateFollowUp } from '../services/ai.js';

const SHEET_ID = '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM'
const MESSAGES_TAB = 'Conversation History';

export function startFollowUpJob() {
  cron.schedule('0 */2 * * *', async () => {
    console.log('🔔 Checking follow-ups...');
    const sheets = await getSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${MESSAGES_TAB}!A:I`  // Include channel col I
    });
    
    const rows = response.data.values || [];
    const now = new Date();
    const staleThreads = [];
    
    // Filter-first: replyNeeded=true, followUp=false (last msg per thread)
    const candidates = rows.filter(row => row[5] === 'true' && row[6] === 'false');
    const lastPerThread = {};
    
    for (const row of candidates.slice().reverse()) {
      const threadId = row[0];
      if (!lastPerThread[threadId]) {
        const hoursSilence = (now - new Date(row[4])) / (1000 * 60 * 60);
        if (hoursSilence > 2) {
          lastPerThread[threadId] = {
            threadId, businessId: row[7], channel: row[8], rowIndex: rows.indexOf(row)
          };
        }
      }
    }
    
    const staleThreadsList = Object.values(lastPerThread);
    console.log(`📤 ${staleThreadsList.length} follow-ups queued`);
    
    // In follow-up job, REPLACE nudge logic:
    for (const thread of staleThreadsList) {
        // 1. Load thread history
        const history = await getThreadHistory(thread.businessId, thread.threadId);
        
        // 2. Get business config
        const business = await getBusinessConfig(thread.businessId);
        
        // 3. AI generates personalized nudge
        const nudgeMsg = await generateFollowUp(history, business);
  
        // 4. Send via channel
        const success = await senders[thread.channel]?.send(thread.threadId, nudgeMsg);
  
        if (success) {
            await markFollowUpSent(sheets, thread.rowIndex);
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
    resource: { values: [['true']] }
  });
}
