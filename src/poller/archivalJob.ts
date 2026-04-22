import cron, { type ScheduledTask } from 'node-cron';
import type { Database } from 'better-sqlite3';
import defaultDb from '../db/connection';

function getRetentionDays(key: string, fallback: number, db: Database): number {
  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row ? parseInt(row.value, 10) : fallback;
}

export function runArchivalJob(db: Database = defaultDb): number {
  const rawDays = getRetentionDays('rawRetentionDays', 7, db);
  const cutoff = new Date(Date.now() - rawDays * 24 * 60 * 60 * 1000).toISOString();

  // Time-series tables with snapshot_time column
  const snapshotTables = [
    'server_snapshots',
    'environment_snapshots',
    'farm_statistics_snapshots',
    'farmland_price_history',
  ];

  let totalDeleted = 0;

  const prune = db.transaction(() => {
    for (const table of snapshotTables) {
      const result = db.prepare(`DELETE FROM ${table} WHERE snapshot_time < ?`).run(cutoff);
      totalDeleted += result.changes;
    }

    // data_quality_alerts uses alert_time — keep resolved ones only for rawDays
    const alertResult = db
      .prepare(`DELETE FROM data_quality_alerts WHERE alert_time < ? AND resolved = 1`)
      .run(cutoff);
    totalDeleted += alertResult.changes;
  });

  prune();
  return totalDeleted;
}

export function scheduleNightlyArchival(db: Database = defaultDb): ScheduledTask {
  return cron.schedule('0 3 * * *', () => {
    console.log('[archival] Running nightly archival job');
    try {
      const deleted = runArchivalJob(db);
      console.log(`[archival] Pruned ${deleted} rows`);
    } catch (err) {
      console.error('[archival] Job failed:', (err as Error).message);
    }
  });
}
