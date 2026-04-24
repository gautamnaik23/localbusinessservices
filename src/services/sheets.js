// src/services/sheets.js
// Complete Google Sheets service for your two-tab structure.
// This handles authentication, reading, and writing to your conversation and appointment tabs.

import { google } from "googleapis";

// SHEET CONFIGURATION - Update these with your actual sheet and tab names
const SHEET_CONFIG = {
  spreadsheetId: process.env.GOOGLE_SHEET_ID, // Your full Google Sheets ID
  conversationTab: "Conversation History", // Your first tab name
  appointmentsTab: "AppointmentFakeTable",  // Your second tab name
  businessTab: "Business Information",
  botTab: "BotMappings"
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

// LOOKUP BY CHANNEL + BOT TOKEN
// -----------------------------------------------------
// Returns {businessId: businessId, token: sender} or null if not found
export async function getBusinessFromChannelBot(channel, secret) {
  try {
    if (!channel || !secret) {
      console.log("❌ Missing channel or botToken:", { channel, secret });
      return null;
    }

    const sheets = await getSheetsClient();

    const range = `${SHEET_CONFIG.botTab}!A:D`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_CONFIG.spreadsheetId,
      range
    });

    const rows = response.data.values;
    console.log(rows);

    for (const row of rows) {
      const rowChannel = row[0]?.trim();
      const rowSender = row[1]?.trim();
      const rowSecret = row[2]?.trim();
      const rowBusinessId = row[3]?.trim();

      if (
        rowChannel &&
        rowSender &&
        rowSecret &&
        rowBusinessId &&
        rowChannel.toLowerCase() === channel.toLowerCase() &&
        rowSecret === secret
      ) {
        return {
          businessId: rowBusinessId,
          token: rowSender
        };
      }
        }

    console.log("❌ No mapping found for:", { channel, botToken });
    return null;
  } catch (error) {
    console.error("❌ getBusinessFromChannelBot error:", error);
    return null;
  }
}

//converts a businessId + channel to a sender name
export async function getSenderInfo(businessId, channel) {
    try {
    if (!channel || !businessId) {
      console.log("❌ Missing businessId or channel:", { channel, businessId });
      return null;
    }

    const sheets = await getSheetsClient();

    const range = `${SHEET_CONFIG.botTab}!A:D`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_CONFIG.spreadsheetId,
      range
    });

    const rows = response.data.values;

    for (const row of rows) {
      const rowChannel = row[0]?.trim();
      const rowSender = row[1]?.trim();
      const rowSecret = row[2]?.trim();
      const rowBusinessId = row[3]?.trim();

      if (
        rowChannel &&
        rowSender &&
        rowSecret &&
        rowBusinessId &&
        rowChannel.toLowerCase() === channel.toLowerCase() &&
        rowBusinessId === businessId
      ) {
        return rowSender;
      }
    }


    console.log("❌ No mapping found for:", { channel, businessId });
    return null;
  } catch (error) {
    console.error("❌ getBusinessFromChannelBot error:", error);
    return null;
  }

}