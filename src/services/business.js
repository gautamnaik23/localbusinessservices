// Loads business configuration from Google Sheets by business_id.
// Finds the row matching business_id and maps columns to AI prompt fields:
// bookingLink, officeNumber, faqs, promotions. Returns null if not found.

import { getSheetsClient } from './sheets.js';

// CONFIGURATION - Update these for your business config tab structure.
// Assumes your "Businesses" tab has: business_id (col H), bookingLink (I), officeNumber (J), faqs/promotions (K+)
const BUSINESS_SHEET_CONFIG = {
  tabName: 'Business Information',        // Your business config tab name
  businessIdColumn: 0,          // Column A (0-indexed: A=0, H=7)
  businessNameColumn: 1,
  officeNumberColumn: 2,        // Column C
  bookingLinkColumn: 3,         // Column D
  faqsColumn: 4,  // Column E (FAQs as comma-separated or JSON)
  promotionsColumn: 5          // Column F (promotions/offers)
  businessWebsiteColumn: 6
};

/**
 * Fetches business config for a specific business_id.
 * @param {string} businessId - Unique ID like "demobusiness" or "client123"
 * @returns {Object|null} Business config or null if not found
 */
export async function getBusinessConfig(businessId) {
  if (!businessId) {
    console.error('No businessId provided');
    return null;
  }

  const sheets = await getSheetsClient();

  // Read all rows from business config tab (columns A-M to cover your structure)
  const range = `${BUSINESS_SHEET_CONFIG.tabName}!A:F`;
  const response = await sheets.spreadsheets.values.get(
    { spreadsheetId: process.env.GOOGLESHEETID, range }
  );

  const rows = response.data.values || [];
  if (rows.length === 0) {
    console.warn(`No business config rows found`);
    return null;
  }

  // Find the row matching this business_id (col H=7)
  const businessRow = rows.find(row => 
    row[BUSINESS_SHEET_CONFIG.businessIdColumn]?.trim() === businessId
  );

  if (!businessRow) {
    console.warn(`Business ${businessId} not found in config`);
    return null;
  }

  // Map Sheet columns to clean AI prompt fields (exact names your prompt expects)
  return {
    businessId,
    businessName: businessRow[BUSINESS_SHEET_CONFIG.bookingNameColumn] || 'Unnamed Business',  // Col A
    bookingLink: businessRow[BUSINESS_SHEET_CONFIG.bookingLinkColumn] || '',
    officeNumber: businessRow[BUSINESS_SHEET_CONFIG.officeNumberColumn] || '',
    faqs: businessRow[BUSINESS_SHEET_CONFIG.faqsColumn] || '',  // e.g., "Service A: info, Service B: info"
    promotions: businessRow[BUSINESS_SHEET_CONFIG.promotionsColumn] || '', // e.g., "10% off first visit"
    website: businessRow[BUSINESS_SHEET_CONFIG.businessWebsiteColumn] || ''  // Col M (optional)
  };
}
