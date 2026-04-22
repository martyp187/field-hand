import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { SalesMarketFeed } from '../../types/salesMarket';

export function writeSales(feed: SalesMarketFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO sales_market (
      vehicle_filename, time_left, age, price, damage, wear,
      operating_time, is_generated, last_updated
    ) VALUES (
      @vehicleFilename, @timeLeft, @age, @price, @damage, @wear,
      @operatingTime, @isGenerated, @now
    )
    ON CONFLICT(vehicle_filename) DO UPDATE SET
      time_left      = excluded.time_left,
      age            = excluded.age,
      price          = excluded.price,
      damage         = excluded.damage,
      wear           = excluded.wear,
      operating_time = excluded.operating_time,
      is_generated   = excluded.is_generated,
      last_updated   = excluded.last_updated
  `);

  const writeAll = db.transaction(() => {
    for (const item of feed.items) {
      upsert.run({
        vehicleFilename: item.xmlFilename,
        timeLeft: item.timeLeft,
        age: item.age,
        price: item.price,
        damage: item.damage,
        wear: item.wear,
        operatingTime: item.operatingTime,
        isGenerated: item.isGenerated ? 1 : 0,
        now,
      });
    }
  });

  writeAll();
}
