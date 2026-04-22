import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { PrecisionFarmingFeed } from '../../types/precisionFarming';

export function writePrecisionFarming(feed: PrecisionFarmingFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO farmland_precision_stats (farmland_id, period_counter_json, total_counter_json, last_updated)
    VALUES (@farmlandId, @periodCounterJson, @totalCounterJson, @lastUpdated)
    ON CONFLICT(farmland_id) DO UPDATE SET
      period_counter_json = excluded.period_counter_json,
      total_counter_json  = excluded.total_counter_json,
      last_updated        = excluded.last_updated
  `);

  const writeAll = db.transaction(() => {
    for (const stat of feed.farmlandStats) {
      upsert.run({
        farmlandId: stat.farmlandId,
        periodCounterJson: JSON.stringify(stat.periodCounter),
        totalCounterJson: JSON.stringify(stat.totalCounter),
        lastUpdated: now,
      });
    }
  });

  writeAll();
}
