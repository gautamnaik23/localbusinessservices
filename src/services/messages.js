// src/services/messages.js
// Manages conversation history in Google Sheets "Sheet1" tab
import { getSheetsClient } from './sheets.js';
import { formatTimestamp, generateSessionId } from "../utils/ids.js";

const SHEET_ID = '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM';
const MESSAGES_TAB = 'Conversation History';  // Your messages tab


// Replace saveMessage calls in widget.js with ONE batch:
export async function saveMessagesBatch(businessId, threadId, messages, channel) {  // messages = [{role, text, replyNeeded, followUp}]
  const sheets = await getSheetsClient();
  const timestamp = formatTimestamp();
  const sessionId = generateSessionId();
  
  const values = messages.map(msg => [
    threadId, sessionId, msg.role, msg.text, timestamp, msg.replyNeeded, msg.followUp, businessId, channel
  ]);
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${MESSAGES_TAB}!A:H`,
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });
  
  console.log(`💾 Batch saved ${values.length} messages`);
}


// Get history for businessId + threadId + sessionId
export async function getThreadHistory(businessId, threadId, sessionId) {
  const sheets = await getSheetsClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${MESSAGES_TAB}!A:H`
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) return [];
  
  // Filter: businessId + threadId + sessionId
  console.log(threadId, sessionId, businessId);
  console.log(rows);
  console.log(rows[-1][0].getClass().getName(), threadId.getClass().getName());
  console.log(rows[-1][0] === threadId, rows[-1][1] == sessionId, rows[-1][7] === businessId)
  const history = rows
    .filter(row => row[0] === threadId && row[1] == sessionId && row[7] === businessId);  // A=threadId, B = sessionId, H=businessId
  
  console.log(`📜 History: ${history.length} messages for ${businessId}/${threadId}`);
  return history;
}
