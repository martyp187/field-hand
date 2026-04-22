import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { ServerStats, FarmlandEntry } from '../../types/stats';

export function writeServerSnapshot(stats: ServerStats, db: Database = defaultDb): void {
  const now = new Date().toISOString();
  const onlinePlayers = stats.slots.players.filter((p) => p.isUsed);
  db.prepare(`
    INSERT INTO server_snapshots
      (snapshot_time, server_name, map_name, day_time_ms, day_time_formatted,
       in_game_day, season, player_count, game_version, slots_capacity, slots_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    now,
    stats.serverName,
    stats.mapName,
    stats.dayTimeMs,
    stats.dayTimeFormatted,
    null,
    null,
    onlinePlayers.length,
    stats.gameVersion,
    stats.slots.capacity,
    stats.slots.numUsed,
  );
}

export function writeFarmlands(farmlands: FarmlandEntry[], db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO farmlands (farmland_id, name, owner_farm_id, area_ha, current_price, x, z, last_updated)
    VALUES (@farmlandId, @name, @ownerFarmId, @areaHa, @price, @x, @z, @now)
    ON CONFLICT(farmland_id) DO UPDATE SET
      name         = excluded.name,
      owner_farm_id = excluded.owner_farm_id,
      area_ha      = excluded.area_ha,
      current_price = excluded.current_price,
      x            = excluded.x,
      z            = excluded.z,
      last_updated = excluded.last_updated
  `);

  // Only record a price history entry when the price has changed
  const latestPrice = db.prepare(
    `SELECT price FROM farmland_price_history WHERE farmland_id = ? ORDER BY id DESC LIMIT 1`,
  );
  const insertHistory = db.prepare(`
    INSERT INTO farmland_price_history (farmland_id, snapshot_time, price, owner_farm_id)
    VALUES (?, ?, ?, ?)
  `);

  const writeAll = db.transaction(() => {
    for (const fl of farmlands) {
      upsert.run({
        farmlandId: fl.id,
        name: fl.name,
        ownerFarmId: fl.ownerFarmId,
        areaHa: fl.areaHa,
        price: fl.price,
        x: fl.x,
        z: fl.z,
        now,
      });

      const prev = latestPrice.get(fl.id) as { price: number } | undefined;
      if (!prev || prev.price !== fl.price) {
        insertHistory.run(fl.id, now, fl.price, fl.ownerFarmId);
      }
    }
  });

  writeAll();
}
