// src/services/sheets.js
// Complete Google Sheets service for your two-tab structure.
// This handles authentication, reading, and writing to your conversation and appointment tabs.

import { google } from "googleapis";

// SHEET CONFIGURATION - Update these with your actual sheet and tab names
const SHEET_CONFIG = {
  spreadsheetId: process.env.GOOGLE_SHEET_ID, // Your full Google Sheets ID
  conversationTab: "Conversation History", // Your first tab name
  appointmentsTab: "AppointmentFakeTable"  // Your second tab name
};

// Auth setup - converts the PEM key from environment variable format
function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail) {
    throw new Error('Missing GOOGLE_CLIENT_EMAIL');
  }
  if (!rawKey) {
    throw new Error('Missing GOOGLE_PRIVATE_KEY');
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');

  return new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

export async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

// Read the conversation tab and return all rows
export async function getConversationHistory(businessId, threadId, sessionId) {
  const sheets = await getSheetsClient();
  
  // Read all rows from the conversation tab
  const range = `${SHEET_CONFIG.conversationTab}!A:H`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    range
  });
  
  const rows = response.data.values || [];
  
  // Filter to only this business and thread and session Id
  return rows.filter(row => {
    if (row.length < 8) return false;
    return row[7] === businessId && row[0] === threadId && row[1] === sessionId; // business ID is column H (index 7)
  });
}


// Read appointments for a business
export async function getAppointments(businessId) {
  const sheets = await getSheetsClient();
  
  const range = `${SHEET_CONFIG.appointmentsTab}!A:F`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    range
  });
  
  const rows = response.data.values || [];
  
  // Filter to this business only (column F)
  return rows.filter(row => row.length >= 6 && row[5] === businessId);
}

// Save or update appointment row
export async function saveAppointment(threadId, appointmentTime, reminder24h, reminder2h, reviewSent, businessId) {
  const sheets = await getSheetsClient();
  
  const newRow = [
    threadId,           // Column A
    appointmentTime,    // Column B
    reminder24h,        // Column C
    reminder2h,         // Column D
    reviewSent,         // Column E
    businessId          // Column F
  ];
  
  const range = `${SHEET_CONFIG.appointmentsTab}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: { values: [newRow] }
  });
  
  console.log(`Saved appointment for business ${businessId}`);
  return true;
}

// THREAD MAPPING - chatId → businessid persistence
const THREAD_CONFIG = {
  tabName: 'TIDtoBID',  // New tab: A=chatId, B=businessid, C=firstSeen
  cols: {
    chatId: 0,        // A
    businessid: 1,    // B
    firstSeen: 2      // C
  }
};

// Save chatId → businessid mapping (called on /start)
export async function saveThreadMapping(chatId, businessid) {
  const sheets = await getSheetsClient();
  
  const newRow = [
    chatId,                                    // A
    businessid,                                // B
    new Date().toISOString().slice(0, 10)      // C: YYYY-MM-DD
  ];
  
  const range = `${THREAD_CONFIG.tabName}!A:C`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM',
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [newRow] }
  });
  
  console.log(`🔗 Saved mapping: ${chatId} → ${businessid}`);
}

// Lookup businessid by chatId
export async function getThreadBusiness(chatId) {
  const sheets = await getSheetsClient();
  
  const range = `${THREAD_CONFIG.tabName}!A:C`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1R0XrgG_TaFesa5feugAV9cAoUOHJye1G7uVJ7X_QgyM',
    range
  });
  
  const rows = res.data.values?.slice(1) || [];  // Skip header
  
  const match = rows.find(row => row[THREAD_CONFIG.cols.chatId] == chatId);
  return match ? match[THREAD_CONFIG.cols.businessid] : null;
}
