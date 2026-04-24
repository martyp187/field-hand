import type { Database } from 'better-sqlite3';
import { broadcast } from '../api/sseManager';

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data_json: string | null;
  farm_id: number | null;
  dedup_key: string | null;
  created_at: string;
}

interface CreateAlertOptions {
  body?: string;
  data?: unknown;
  farm_id?: number;
  /** If set, only one alert with this key will ever exist (INSERT OR IGNORE). */
  dedup_key?: string;
}

/**
 * Insert a new notification row and broadcast an SSE event.
 * Returns true if the alert was inserted, false if it was deduped.
 */
export function createAlert(
  db: Database,
  type: string,
  title: string,
  opts: CreateAlertOptions = {},
): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO notifications (type, title, body, data_json, farm_id, dedup_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      type,
      title,
      opts.body ?? null,
      opts.data !== undefined ? JSON.stringify(opts.data) : null,
      opts.farm_id ?? null,
      opts.dedup_key ?? null,
    );

  if (result.changes > 0) {
    broadcast('notification', { type, title, body: opts.body ?? null });
    return true;
  }
  return false;
}

/** Returns up to 100 notifications created within the last 7 days, newest first. */
export function getRecentAlerts(db: Database): Notification[] {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  return db
    .prepare(
      `SELECT * FROM notifications WHERE created_at > ? ORDER BY created_at DESC LIMIT 100`,
    )
    .all(cutoff) as Notification[];
}

/** Delete a single notification by id. */
export function deleteAlert(db: Database, id: number): boolean {
  const result = db.prepare(`DELETE FROM notifications WHERE id = ?`).run(id);
  return result.changes > 0;
}

/** Delete all notifications older than retentionDays. */
export function pruneOldAlerts(db: Database, retentionDays = 7): void {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000).toISOString();
  db.prepare(`DELETE FROM notifications WHERE created_at < ?`).run(cutoff);
}
