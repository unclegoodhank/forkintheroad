const express = require('express');
const session = require('express-session');
const path = require('path');
const https = require('https');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.PASSWORD || 'hello';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fork-in-the-road-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// ── Static assets ──────────────────────────────────────────────────────────
app.use('/images', express.static(path.join(__dirname, 'images')));
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'restaurant-recommender.html')));

// ── Restaurant API ─────────────────────────────────────────────────────────
app.get('/api/restaurants', (req, res) => {
  const rows = db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  res.json(rows);
});

app.patch('/api/restaurants/:id/visited', (req, res) => {
  const { id } = req.params;
  const { visited } = req.body;
  db.prepare('UPDATE restaurants SET visited = ?, visited_at = ? WHERE id = ?')
    .run(visited ? 1 : 0, visited ? new Date().toISOString().slice(0, 10) : null, id);
  res.json({ ok: true });
});

// ── CSV export ─────────────────────────────────────────────────────────────
app.get('/export', (req, res) => {
  const rows = db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  const escape = v => { v = String(v ?? ''); return (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v; };
  const header = 'Title,Note,URL,Tags,Cuisine,Latitude,Longitude,Visited,City,State,Type';
  const csv = [header, ...rows.map(r =>
    [r.title, r.note, r.url, r.tags, r.cuisine, r.lat, r.lng, r.visited ? 'Yes' : '', r.city, r.state, r.type].map(escape).join(',')
  )].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="restaurants.csv"');
  res.send(csv);
});

// ── Password-protected new-stuff page ─────────────────────────────────────
app.get('/login', (req, res) => {
  const error = req.session.loginError;
  delete req.session.loginError;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Required</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fcf9f3; }
    form { text-align: center; }
    input { padding: 8px 12px; font-size: 16px; border: 1px solid #ccc; margin-right: 8px; }
    button { padding: 8px 16px; font-size: 16px; cursor: pointer; }
    .error { color: red; font-size: 14px; margin-top: 8px; }
  </style>
</head>
<body>
  <form method="POST" action="/login">
    <input type="password" name="password" placeholder="Password" autofocus>
    <button type="submit">Enter</button>
    ${error ? `<div class="error">${error}</div>` : ''}
  </form>
</body>
</html>`);
});

app.post('/login', (req, res) => {
  if (req.body.password === PASSWORD) {
    req.session.authenticated = true;
    const returnTo = req.session.returnTo || '/new-stuff';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } else {
    req.session.loginError = 'Incorrect password.';
    res.redirect('/login');
  }
});

app.get('/new-stuff', (req, res) => {
  if (!req.session.authenticated) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'new-stuff.html'));
});

// ── Admin ──────────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  if (!req.session.authenticated) { req.session.returnTo = '/admin'; return res.redirect('/login'); }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.put('/api/restaurants/:id', (req, res) => {
  const { title, note, url, tags, cuisine, lat, lng, visited, visited_at, city, state, country, type, open_after_10pm, open_after_11pm, open_after_midnight } = req.body;
  db.prepare(`UPDATE restaurants SET title=?, note=?, url=?, tags=?, cuisine=?, lat=?, lng=?, visited=?, visited_at=?, city=?, state=?, country=?, type=?, open_after_10pm=?, open_after_11pm=?, open_after_midnight=? WHERE id=?`)
    .run(title, note, url, tags, cuisine, lat !== '' ? parseFloat(lat) : null, lng !== '' ? parseFloat(lng) : null, visited ? 1 : 0, visited_at || null, city || '', state || '', country || '', type || '', open_after_10pm ? 1 : 0, open_after_11pm ? 1 : 0, open_after_midnight ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/restaurants/:id/note', (req, res) => {
  const { note } = req.body;
  db.prepare('UPDATE restaurants SET note = ? WHERE id = ?').run(note ?? '', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/restaurants/:id', (req, res) => {
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/restaurants', (req, res) => {
  const { title, note, url, tags, cuisine, lat, lng, visited, city, state, country, type, open_after_10pm, open_after_11pm, open_after_midnight } = req.body;
  const result = db.prepare(
    `INSERT INTO restaurants (title, note, url, tags, cuisine, lat, lng, visited, city, state, country, type, open_after_10pm, open_after_11pm, open_after_midnight, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    title, note || '', url || '', tags || '', cuisine || '',
    lat !== '' && lat != null ? parseFloat(lat) : null,
    lng !== '' && lng != null ? parseFloat(lng) : null,
    visited ? 1 : 0, city || '', state || '', country || '', type || '',
    open_after_10pm ? 1 : 0, open_after_11pm ? 1 : 0, open_after_midnight ? 1 : 0
  );
  res.json({ ok: true, id: result.lastInsertRowid });
});

// ── CSV import (sync CSV → DB, insert missing rows by title) ───────────────
app.post('/api/admin/import-csv', (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });
  const csvPath = path.join(__dirname, 'Want-to-go.csv');
  if (!fs.existsSync(csvPath)) return res.status(404).json({ error: 'CSV not found' });

  const text = fs.readFileSync(csvPath, 'utf-8');
  const lines = text.split(/\r?\n/);
  const headers = splitCSVLine(lines[0]);
  const csvRows = lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const vals = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = vals[i] || '');
    return row;
  }).filter(Boolean);

  const existingByTitle = new Map(
    db.prepare('SELECT id, title FROM restaurants').all().map(r => [r.title.toLowerCase(), r.id])
  );

  const insert = db.prepare(
    `INSERT INTO restaurants (title, note, url, tags, cuisine, lat, lng, visited, city, state, type)
     VALUES (@title, @note, @url, @tags, @cuisine, @lat, @lng, @visited, @city, @state, @type)`
  );
  const update = db.prepare(
    `UPDATE restaurants SET note=@note, url=@url, tags=@tags, cuisine=@cuisine,
     lat=@lat, lng=@lng, city=@city, state=@state, type=@type WHERE id=@id`
  );

  let added = 0, updated = 0;
  db.transaction(rows => {
    rows.forEach(r => {
      if (!r.Title) return;
      const data = {
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
      };
      const existingId = existingByTitle.get(r.Title.toLowerCase());
      if (existingId) {
        update.run({ ...data, id: existingId });
        updated++;
      } else {
        insert.run(data);
        added++;
      }
    });
  })(csvRows);

  res.json({ ok: true, added, updated });
});

function splitCSVLine(line) {
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

// Helper: HTTPS GET with redirect following, returns { finalUrl, body }
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    lib.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return httpsGet(next, headers).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ finalUrl: url, body }));
    }).on('error', reject);
  });
}

app.post('/api/geocode', async (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  try {
    const { body } = await httpsGet(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { 'User-Agent': 'fork-in-the-road-app/1.0' }
    );
    const data = JSON.parse(body);
    const addr = data.address || {};
    res.json({
      city:    addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '',
      state:   addr.state || '',
      country: addr.country || '',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lookup', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL required' });

  try {
    let workingUrl = url.trim();

    // Follow redirects for short links (maps.app.goo.gl, goo.gl, etc.)
    if (/goo\.gl|maps\.app/i.test(workingUrl)) {
      const { finalUrl } = await httpsGet(workingUrl, { 'User-Agent': 'Mozilla/5.0 (compatible)' });
      workingUrl = finalUrl;
    }

    // Extract place name from URL path (/maps/place/Name/...)
    const nameMatch = workingUrl.match(/\/maps\/place\/([^/@?]+)/);
    let title = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : '';

    // Extract name, city, state from ?q= param (e.g. ?q=Name,+Address,+City,+State+Zip)
    let city = '', state = '';
    const qMatch = workingUrl.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const parts = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).split(',').map(s => s.trim());
      const addrIdx = parts.findIndex(p => /^\d/.test(p));
      if (!title) {
        title = (addrIdx > 0 ? parts.slice(0, addrIdx) : parts.slice(0, 1)).join(', ');
      }
      if (addrIdx > 0) {
        city  = parts[addrIdx + 1] || '';
        state = (parts[addrIdx + 2] || '').replace(/\s*\d.*/, '').trim(); // strip zip
      }
    }

    // Prefer precise coords embedded in data param: !3d<lat>!4d<lng>
    let lat = null, lng = null;
    const preciseMatch = workingUrl.match(/!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/);
    if (preciseMatch) {
      lat = parseFloat(preciseMatch[1]);
      lng = parseFloat(preciseMatch[2]);
    }

    // Fall back to @lat,lng,zoom in URL
    if (lat === null) {
      const atMatch = workingUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) { lat = parseFloat(atMatch[1]); lng = parseFloat(atMatch[2]); }
    }

    // Fetch the Maps page — extract coords, name, and cuisine category from HTML
    let cuisine = '';
    if (workingUrl.includes('google.com/maps')) {
      const { body } = await httpsGet(workingUrl, {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      });
      if (lat === null) {
        const centerMatch = body.match(/staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
        if (centerMatch) { lat = parseFloat(centerMatch[1]); lng = parseFloat(centerMatch[2]); }
      }
      if (!title) {
        const nameMatch2 = body.match(/0x[0-9a-f]+:0x[0-9a-f]+","([^"]+)"\]\]\]/);
        if (nameMatch2) title = nameMatch2[1];
      }
      // Extract category from <title>: "Name · Category · Address · Google Maps"
      const titleTag = body.match(/<title>([^<]+)<\/title>/);
      if (titleTag) {
        const sep = titleTag[1].includes('·') ? /\s*·\s*/ : /\s*-\s*/;
        const parts = titleTag[1].split(sep).map(s => s.trim()).filter(s => s && !/^Google Maps$/i.test(s));
        // parts[0] = name, parts[1] = category (if it exists and isn't the address)
        if (parts.length >= 2 && !/^\d/.test(parts[1])) cuisine = parts[1];
      }
    }

    // Last resort: Nominatim geocoding by name
    if (lat === null && title) {
      const { body } = await httpsGet(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(title)}&format=json&limit=1`,
        { 'User-Agent': 'fork-in-the-road-app/1.0' }
      );
      const nomData = JSON.parse(body);
      if (nomData[0]) { lat = parseFloat(nomData[0].lat); lng = parseFloat(nomData[0].lon); }
    }

    // Nominatim reverse geocode — get name (if missing) + city/state/country
    let country = '';
    if (lat !== null) {
      const zoom = !title ? 18 : 10;
      const { body } = await httpsGet(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=${zoom}`,
        { 'User-Agent': 'fork-in-the-road-app/1.0' }
      );
      const nomData = JSON.parse(body);
      if (nomData) {
        if (!title && nomData.name) title = nomData.name;
        const addr = nomData.address || {};
        if (!city)  city    = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '';
        if (!state) state   = addr.state || '';
        country = addr.country || '';
      }
    }

    // DuckDuckGo HTML search — extract category from result titles (e.g. "Name | Brunch Restaurant in City, State")
    if (!cuisine && title) {
      const q = [title, city, state].filter(Boolean).join(' ');
      const { body } = await httpsGet(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
        { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      );
      // Result titles often: "Name | Category in City, State" (from Yelp, TripAdvisor, etc.)
      const titleMatch = body.match(/\|\s*([^|<"]{4,60}?)\s+(?:in\s+[\w\s,]+|[-–<])/i);
      if (titleMatch) cuisine = titleMatch[1].trim();
    }

    res.json({ title, url: workingUrl, lat, lng, city, state, country, cuisine });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
// Locally: use HTTPS if certs exist. On Railway: plain HTTP (they handle SSL).
const SSL_KEY  = path.join(__dirname, 'key.pem');
const SSL_CERT = path.join(__dirname, 'cert.pem');

if (!process.env.RAILWAY_ENVIRONMENT && fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  https.createServer({ key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) }, app)
    .listen(PORT, () => console.log(`Server running at https://localhost:${PORT}`));
} else {
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}
