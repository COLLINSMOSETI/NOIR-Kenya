const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "noir.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('clothes', 'shoes', 'accessories')),
    description TEXT DEFAULT '',
    price_kes INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    product_name TEXT,
    amount_kes INTEGER,
    phone TEXT,
    checkout_request_id TEXT,
    merchant_request_id TEXT,
    status TEXT DEFAULT 'PENDING',
    result_description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
