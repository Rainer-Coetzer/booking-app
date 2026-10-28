import 'server-only';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type DB = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');

export function openDatabase(file: string): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

// Survive Next's dev-mode module reloads without opening a second handle.
const globalForDb = globalThis as unknown as { __bookingDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__bookingDb) {
    const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    globalForDb.__bookingDb = openDatabase(path.join(dir, 'booking.db'));
  }
  return globalForDb.__bookingDb;
}

/** Test hook: swap in an isolated database. */
export function setDb(db: DB | undefined) {
  globalForDb.__bookingDb = db;
}
