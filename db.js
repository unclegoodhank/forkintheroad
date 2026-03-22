const Database = require('better-sqlite3');
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
try { db.exec(`ALTER TABLE restaurants ADD COLUMN city     TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN state    TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN type     TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN added_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN country TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN open_after_10pm  INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN open_after_11pm  INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN open_after_midnight INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE restaurants ADD COLUMN visited_at TEXT`); } catch {}

module.exports = db;
