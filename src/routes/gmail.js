import nodemailer from 'nodemailer';
import { google } from 'googleapis';

// We use Google's OAuth2 client to get short-lived access tokens.
// The refresh token stays stored in your business config.
// The access token is generated on demand.
const OAuth2 = google.auth.OAuth2;
import dotenv from 'dotenv';
dotenv.config();

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
  const oauth2Client = new OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );
  // Give the OAuth2 client the refresh token.
  // This lets Google issue a new access token when needed.
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Ask Google for a short-lived access token.
  // Nodemailer uses this token to authenticate with Gmail SMTP.
  const accessTokenResponse = await oauth2Client.getAccessToken();
  console.log('✅ Access token OK');
  const accessToken = accessTokenResponse?.token;

  // If we did not get a token, stop immediately.
  if (!accessToken) {
    throw new Error('Could not get Gmail access token');
  }

  // Create the SMTP transporter that will actually send the email.
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: email,
      clientId,
      clientSecret,
      refreshToken,
      accessToken
    }
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
 */
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
  // Build the Gmail transporter for this business.
  const transporter = await createGmailTransporter({
    clientId,
    clientSecret,
    refreshToken,
    email: businessEmail
  });

  // Send the actual email.
  // The "from" field should match the connected Gmail account.
  return transporter.sendMail({
    from: `${businessName} <${businessEmail}>`,
    to,
    subject,
    html
  });
}
