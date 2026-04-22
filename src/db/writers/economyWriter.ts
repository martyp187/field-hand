import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { EconomyFeed } from '../../types/economy';

export function writeEconomy(feed: EconomyFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO economy_prices (fill_type, period_name, price, last_updated)
    VALUES (@fillType, @periodName, @price, @now)
    ON CONFLICT(fill_type, period_name) DO UPDATE SET
      price        = excluded.price,
      last_updated = excluded.last_updated
  `);

  const writeAll = db.transaction(() => {
    for (const crop of feed.crops) {
      for (const point of crop.prices) {
        upsert.run({
          fillType: crop.fillType,
          periodName: point.period,
          price: point.price,
          now,
        });
      }
    }
  });

  writeAll();
}
