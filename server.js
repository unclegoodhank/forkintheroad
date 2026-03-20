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
    res.redirect('/new-stuff');
  } else {
    req.session.loginError = 'Incorrect password.';
    res.redirect('/login');
  }
});

app.get('/new-stuff', (req, res) => {
  if (!req.session.authenticated) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'new-stuff.html'));
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
