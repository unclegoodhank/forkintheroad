#!/usr/bin/env node
// One-time script: reverse-geocode missing city/state/country from lat/lng via Nominatim
// Usage: node backfill-locations.js

const https = require('https');
const db = require('./db');

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
  const body = await httpsGet(url, { 'User-Agent': 'fork-in-the-road-backfill/1.0' });
  const data = JSON.parse(body);
  const addr = data.address || {};
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '';
  const state = addr.state || addr['state_district'] || '';
  const country = addr.country || '';
  return { city, state, country };
}

const update = db.prepare('UPDATE restaurants SET city = ?, state = ?, country = ? WHERE id = ?');

const rows = db.prepare(
  `SELECT id, title, lat, lng, city, state FROM restaurants WHERE lat IS NOT NULL AND (country = '' OR country IS NULL)`
).all();

console.log(`Found ${rows.length} rows to backfill.`);

(async () => {
  let updated = 0, failed = 0;
  for (const row of rows) {
    try {
      const { city, state, country } = await reverseGeocode(row.lat, row.lng);
      update.run(city || row.city, state || row.state, country, row.id);
      console.log(`✓ ${row.title} → ${city}, ${state}, ${country}`);
      updated++;
    } catch (e) {
      console.warn(`✗ ${row.title}: ${e.message}`);
      failed++;
    }
    await sleep(1100); // Nominatim rate limit: 1 req/sec
  }
  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
})();
