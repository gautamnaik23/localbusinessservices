// src/services/sheets.js
// Handles authentication and access to the Google Sheets API.
// This file will be used by all other services that need to read/write data.

import { google } from "googleapis";

function getAuth() {
  // Google service account private keys often arrive with literal "\n"
  // in environment variables, so we convert them back into real newlines.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Create a JWT auth client for the service account.
  return new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

export async function getSheetsClient() {
  // Create the auth client.
  const auth = getAuth();

  // Authorize before using the Sheets API.
  await auth.authorize();

  // Return the Sheets client for v4 API access.
  return google.sheets({ version: "v4", auth });
}
