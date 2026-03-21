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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'restaurant-recommender.html')));

// ── Restaurant API ─────────────────────────────────────────────────────────
app.get('/api/restaurants', (req, res) => {
  const rows = db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  res.json(rows);
});

app.patch('/api/restaurants/:id/visited', (req, res) => {
  const { id } = req.params;
  const { visited } = req.body;
  db.prepare('UPDATE restaurants SET visited = ? WHERE id = ?').run(visited ? 1 : 0, id);
  res.json({ ok: true });
});

// ── CSV export ─────────────────────────────────────────────────────────────
app.get('/export', (req, res) => {
  const rows = db.prepare('SELECT * FROM restaurants ORDER BY id').all();
  const escape = v => { v = String(v ?? ''); return (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v; };
  const header = 'Title,Note,URL,Tags,Cuisine,Latitude,Longitude,Visited';
  const csv = [header, ...rows.map(r =>
    [r.title, r.note, r.url, r.tags, r.cuisine, r.lat, r.lng, r.visited ? 'Yes' : ''].map(escape).join(',')
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
  const { title, note, url, tags, cuisine, lat, lng, visited } = req.body;
  db.prepare(`UPDATE restaurants SET title=?, note=?, url=?, tags=?, cuisine=?, lat=?, lng=?, visited=? WHERE id=?`)
    .run(title, note, url, tags, cuisine, lat !== '' ? parseFloat(lat) : null, lng !== '' ? parseFloat(lng) : null, visited ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/restaurants/:id', (req, res) => {
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/restaurants', (req, res) => {
  const { title, note, url, tags, cuisine, lat, lng, visited } = req.body;
  const result = db.prepare(
    `INSERT INTO restaurants (title, note, url, tags, cuisine, lat, lng, visited) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    title, note || '', url || '', tags || '', cuisine || '',
    lat !== '' && lat != null ? parseFloat(lat) : null,
    lng !== '' && lng != null ? parseFloat(lng) : null,
    visited ? 1 : 0
  );
  res.json({ ok: true, id: result.lastInsertRowid });
});

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

    // Extract place name from URL path
    const nameMatch = workingUrl.match(/\/maps\/place\/([^/@?]+)/);
    const title = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : '';

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

    // Last resort: Nominatim geocoding by name
    if (lat === null && title) {
      const { body } = await httpsGet(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(title)}&format=json&limit=1`,
        { 'User-Agent': 'fork-in-the-road-app/1.0' }
      );
      const nomData = JSON.parse(body);
      if (nomData[0]) { lat = parseFloat(nomData[0].lat); lng = parseFloat(nomData[0].lon); }
    }

    res.json({ title, url: workingUrl, lat, lng });
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
