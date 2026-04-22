import type { Database } from 'better-sqlite3';
import defaultDb from '../db/connection';

export function updatePollerHealth(
  sourceName: string,
  success: boolean,
  error?: string,
  db: Database = defaultDb,
): void {
  const now = new Date().toISOString();

  if (success) {
    db.prepare(`
      INSERT INTO poller_health (source_name, last_poll_at, last_success_at, last_error, consecutive_failures, status)
      VALUES (@sourceName, @now, @now, NULL, 0, 'OK')
      ON CONFLICT(source_name) DO UPDATE SET
        last_poll_at         = excluded.last_poll_at,
        last_success_at      = excluded.last_success_at,
        last_error           = NULL,
        consecutive_failures = 0,
        status               = 'OK'
    `).run({ sourceName, now });
  } else {
    db.prepare(`
      INSERT INTO poller_health (source_name, last_poll_at, last_success_at, last_error, consecutive_failures, status)
      VALUES (@sourceName, @now, NULL, @error, 1, 'DEGRADED')
      ON CONFLICT(source_name) DO UPDATE SET
        last_poll_at         = excluded.last_poll_at,
        last_error           = excluded.last_error,
        consecutive_failures = consecutive_failures + 1,
        status               = CASE WHEN consecutive_failures + 1 >= 3 THEN 'DOWN' ELSE 'DEGRADED' END
    `).run({ sourceName, now, error: error ?? null });
  }
}

export function insertDataAlert(
  source: string,
  validatorName: string,
  description: string,
  db: Database = defaultDb,
): void {
  db.prepare(
    `INSERT INTO data_quality_alerts (alert_time, source, validator_name, description, resolved)
     VALUES (?, ?, ?, ?, 0)`,
  ).run(new Date().toISOString(), source, validatorName, description);
}

export function checkStaleAndAlert(
  sourceName: string,
  intervalSeconds: number,
  db: Database = defaultDb,
): void {
  const health = db
    .prepare(`SELECT last_success_at FROM poller_health WHERE source_name = ?`)
    .get(sourceName) as { last_success_at: string | null } | undefined;

  if (!health?.last_success_at) return;

  const staleCutoffMs = Date.now() - 2 * intervalSeconds * 1000;
  if (new Date(health.last_success_at).getTime() < staleCutoffMs) {
    insertDataAlert(
      sourceName,
      'stale_data',
      `${sourceName} has not updated in over ${intervalSeconds * 2}s. Last success: ${health.last_success_at}`,
      db,
    );
  }
}
