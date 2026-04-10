// src/services/business.js
// Loads business-specific config by business_id.
// Right now this returns mock data.
// Later it will read from your business config tab in Google Sheets.

export async function getBusinessConfig(businessId) {
  // Temporary mock object for development.
  return {
    business_id: businessId,
    business_name: "Demo Business",
    booking_link: "https://example.com/book",
    phone_number: "555-555-5555",
    website: "https://example.com",
    faqs: []
  };
}
