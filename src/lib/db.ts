import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "inventory.db");

declare global {
  // eslint-disable-next-line no-var
  var __inventoryDb: Database.Database | undefined;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      part_number TEXT DEFAULT '',
      serial_number TEXT DEFAULT '',
      vendor TEXT DEFAULT '',
      url TEXT DEFAULT '',
      category TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 0,
      location TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('out','in','adjust')),
      delta INTEGER NOT NULL,
      qty_after INTEGER NOT NULL,
      person TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_part ON transactions(part_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pin_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);
  const cols = db.prepare("PRAGMA table_info(parts)").all() as { name: string }[];
  for (const col of ["serial_number", "vendor", "url"]) {
    if (!cols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE parts ADD COLUMN ${col} TEXT DEFAULT ''`);
    }
  }
}

export function getDb(): Database.Database {
  if (!global.__inventoryDb) {
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    global.__inventoryDb = db;
  }
  migrate(global.__inventoryDb);
  return global.__inventoryDb;
}

export interface Part {
  id: number;
  name: string;
  part_number: string;
  serial_number: string;
  vendor: string;
  url: string;
  category: string;
  quantity: number;
  location: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Txn {
  id: number;
  part_id: number;
  type: "out" | "in" | "adjust";
  delta: number;
  qty_after: number;
  person: string;
  note: string;
  created_at: string;
}
