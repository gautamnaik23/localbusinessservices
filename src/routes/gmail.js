import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import {setHistoryId, getHistoryId} from '../services/sheets.js';

// We use Google's OAuth2 client to get short-lived access tokens.
// The refresh token stays stored in your business config.
// The access token is generated on demand.
const OAuth2 = google.auth.OAuth2;

/**
 * Create a Gmail transporter for one business.
 *
 * This function:
 * 1. Builds an OAuth2 client using that business's Google credentials.
 * 2. Uses the refresh token to request a short-lived access token.
 * 3. Creates a Nodemailer transporter that can send mail via Gmail SMTP.
 *
 * Why this exists:
 * - Gmail does not want you storing passwords in your app.
 * - OAuth2 is the supported secure way to send on behalf of a user.
 */
export async function createGmailTransporter({
  clientId,
  clientSecret,
  refreshToken,
  email
}) {
  console.log('🔥 OAuth DEBUG:', {
    hasClientId: !!clientId,
    clientIdPreview: clientId?.slice(0, 20) + '...',
    hasClientSecret: !!clientSecret,
    hasRefreshToken: !!refreshToken,
    email
  });
  // Create the OAuth2 client with the Google app credentials.
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  // Give the OAuth2 client the refresh token.
  // This lets Google issue a new access token when needed.
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Ask Google for a short-lived access token.
  // Nodemailer uses this token to authenticate with Gmail SMTP.
  const accessTokenResponse = await oauth2Client.getAccessToken();
  console.log('✅ Access token OK');
  const accessToken = (await oauth2Client.getAccessToken()).token;

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // If we did not get a token, stop immediately.
  if (!accessToken) {
    throw new Error('Could not get Gmail access token');
  }

  // Create the SMTP transporter that will actually send the email.
  // ✅ FIX: Port 587 + STARTTLS (works on Render/Fly.io)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,           
    secure: false,      
    auth: {
      type: 'OAuth2',
      user: email,
      clientId,
      clientSecret,
      refreshToken,
      accessToken
    },
    // ✅ IPv6 workaround
    family: 4,           // Force IPv4 only
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });
}


/**
 * Send one email through the business's Gmail account.
 *
 * Parameters:
 * - to: customer email address
 * - subject: email subject line
 * - html: body content in HTML
 * - fromName: business display name
 * - fromEmail: business Gmail address
 * - clientId/clientSecret/refreshToken: OAuth credentials for that business
 
export async function sendGmailEmail({
  to,
  subject,
  html,
  businessName,
  businessEmail,
  clientId,
  clientSecret,
  refreshToken
}) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const accessToken = (await oauth2Client.getAccessToken()).token;
  if (!accessToken) {
    throw new Error('Failed to get Gmail access token');
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const message = [
    `From: ${businessName} <${businessEmail}>`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    `Subject: ${subject}`,
    '', // Empty line
    html
  ].join('\n');

  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

  console.log(`📧 Sending Gmail to ${to}: ${subject}`);
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
}
*/


export async function sendGmailEmail({
  to,
  subject,
  html,
  businessName,
  businessEmail,
  clientId,
  clientSecret,
  refreshToken,
  threadId,
  inReplyTo,
  references
}) {
  // Create an OAuth client for this business's Gmail account
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

  // Load the saved refresh token so Google can mint a new access token
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const accessToken = (await oauth2Client.getAccessToken()).token;
  if (!accessToken) {
    throw new Error('Failed to get Gmail access token');
  }
  // Build the Gmail API client using the OAuth client
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build the email headers
  // For threaded replies, Gmail cares about Subject, In-Reply-To, and References
  const headers = [
    `From: ${businessName} <${businessEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8'
  ];

  // These two headers are what makes mail clients (and Gmail itself)
  // treat this as a reply instead of a new conversation.
  if (inReplyTo) {
    const wrap = (id) => (id.startsWith('<') ? id : `<${id}>`);
    headers.push(`In-Reply-To: ${wrap(inReplyTo)}`);
    headers.push(`References: ${wrap(references || inReplyTo)}`);
  }

  // Combine headers and HTML body into a raw RFC 2822 message
  const message = [...headers, '', html].join('\r\n');

  // Gmail API expects base64url encoding, not plain base64
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log(`📧 Sending Gmail to ${to}: ${subject}${threadId ? ` (thread ${threadId})` : ''}`);


  // Send the message.
  // threadId is what tells Gmail which conversation this belongs to.
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      ...(threadId ? { threadId } : {})
    }
  });
}



// ===============================
// GMAIL PUSH WATCH (INBOUND EMAILS)
// ===============================
/**
 * Starts Gmail push notifications for a business inbox.
 * Call this ONCE when a business connects Gmail.
 */
export async function startGmailWatch({
  clientId,
  clientSecret,
  refreshToken
}) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client
  });

  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: "projects/chat-widget-492415/topics/vesta",
      labelIds: ["INBOX"] // only inbox emails
    }
  });

  console.log("📡 Gmail watch activated:", res.data);

  return {
    historyId: res.data.historyId,
    expiration: res.data.expiration
  };
}

// ===============================
// FETCH GMAIL HISTORY CHANGES
// ===============================
export async function getGmailHistory({
  clientId,
  clientSecret,
  refreshToken,
  startHistoryId
}) {
  console.log("🔥 Fetching Gmail history from ID:", startHistoryId);
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
  });

  const res = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded']
  });

  return res.data.history || [];
}

// ===============================
// FETCH FULL EMAIL MESSAGE
// ===============================
export async function getGmailMessage({
  clientId,
  clientSecret,
  refreshToken,
  messageId
}) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
  });

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  return res.data;
}

// ===============================
// GET LATEST MESSAGE IN AN EMAIL THREAD (for follow-up reply threading)
// ===============================
/**
 * Fetches the Message-ID and Subject of the most recent message in a Gmail thread.
 * Used so follow-ups can reply into the existing thread instead of starting a new one.
 */
export async function getLatestMessageInThread({
  clientId,
  clientSecret,
  refreshToken,
  threadId
}) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['Message-Id', 'Subject']
  });

  const messages = res.data.messages || [];
  const last = messages[messages.length - 1];
  if (!last) return null;

  const headers = last.payload.headers || [];
  const messageId = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';

  return { messageId, subject };
}
