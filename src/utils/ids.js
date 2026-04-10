// src/utils/ids.js
// Utility functions for generating IDs

export function generateSessionId() {
  // Format: MMDDYY (e.g., 04092026 for April 9th, 2026)
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${month}${day}${year}`;
}
