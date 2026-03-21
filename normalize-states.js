#!/usr/bin/env node
// One-time script: normalize state strings to 2-letter USPS abbreviations
// Usage: node normalize-states.js

const db = require('./db');

const STATE_MAP = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

const update = db.prepare('UPDATE restaurants SET state = ? WHERE id = ?');
const rows = db.prepare("SELECT id, state FROM restaurants WHERE state != '' AND state IS NOT NULL").all();

let changed = 0, skipped = 0;

for (const row of rows) {
  const normalized = STATE_MAP[row.state.toLowerCase().trim()];
  if (normalized && normalized !== row.state) {
    update.run(normalized, row.id);
    changed++;
  } else {
    skipped++;
  }
}

console.log(`Done. Normalized: ${changed}, already correct or unknown: ${skipped}`);

// Show any remaining non-standard values
const odd = db.prepare("SELECT DISTINCT state FROM restaurants WHERE state != '' AND state IS NOT NULL ORDER BY state").all();
console.log('Distinct state values now:', odd.map(r => r.state));
