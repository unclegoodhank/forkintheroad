const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'restaurants.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    title   TEXT    NOT NULL,
    note    TEXT    DEFAULT '',
    url     TEXT    DEFAULT '',
    tags    TEXT    DEFAULT '',
    cuisine TEXT    DEFAULT '',
    lat     REAL,
    lng     REAL,
    visited INTEGER DEFAULT 0
  )
`);

// Migrations — safe to run on existing databases
try { db.exec(`ALTER TABLE restaurants ADD COLUMN city  TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN state TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN type  TEXT DEFAULT ''`); } catch {}

// Seed from CSV on first run
const empty = db.prepare('SELECT COUNT(*) as n FROM restaurants').get().n === 0;
if (empty) {
  const csvPath = path.join(__dirname, 'Want-to-go.csv');
  if (fs.existsSync(csvPath)) {
    const rows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
    const insert = db.prepare(`
      INSERT INTO restaurants (title, note, url, tags, cuisine, lat, lng, visited, city, state, type)
      VALUES (@title, @note, @url, @tags, @cuisine, @lat, @lng, @visited, @city, @state, @type)
    `);
    const seen = new Set();
    const unique = rows
      .filter(r => r.Title)
      .filter(r => { const k = r.Title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .map(r => ({
        title:   r.Title   || '',
        note:    r.Note    || r.Comment || '',
        url:     r.URL     || '',
        tags:    r.Tags    || '',
        cuisine: r.Cuisine || '',
        lat:     r.Latitude  ? parseFloat(r.Latitude)  : null,
        lng:     r.Longitude ? parseFloat(r.Longitude) : null,
        visited: (r.Visited || '').trim().toLowerCase() === 'yes' ? 1 : 0,
        city:    r.City  || '',
        state:   r.State || '',
        type:    r.Type  || '',
      }));
    db.transaction(rows => rows.forEach(r => insert.run(r)))(unique);
    console.log(`Seeded ${unique.length} restaurants from Want-to-go.csv`);
  }
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const vals = splitLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = vals[i] || '');
    return row;
  }).filter(Boolean);
}

function splitLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else { cur += c; }
  }
  result.push(cur);
  return result;
}

module.exports = db;
