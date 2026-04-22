import Database from 'better-sqlite3';
import { initSchema, seedSettings } from '../../src/db/schema';

export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  seedSettings(db);
  return db;
}
