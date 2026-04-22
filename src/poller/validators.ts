import type { Database } from 'better-sqlite3';
import defaultDb from '../db/connection';
import { insertDataAlert } from './pollerHealth';
import type { ServerStats } from '../types/stats';
import type { FarmsFeed } from '../types/farms';
import type { FieldsFeed } from '../types/fields';
import type { VehiclesFeed } from '../types/vehicles';

export function validateServerStats(stats: ServerStats, db: Database = defaultDb): void {
  // Game version change
  const last = db
    .prepare(`SELECT game_version FROM server_snapshots ORDER BY id DESC LIMIT 1`)
    .get() as { game_version: string } | undefined;

  if (last?.game_version && last.game_version !== stats.gameVersion) {
    insertDataAlert(
      'http',
      'game_version_change',
      `Game version changed: ${last.game_version} → ${stats.gameVersion}`,
      db,
    );
  }

  // dayTime regression (unexplained server restart if time goes backwards significantly)
  const lastSnap = db
    .prepare(`SELECT day_time_ms FROM server_snapshots ORDER BY id DESC LIMIT 1`)
    .get() as { day_time_ms: number } | undefined;

  if (lastSnap && stats.dayTimeMs < lastSnap.day_time_ms - 60_000) {
    insertDataAlert(
      'http',
      'daytime_regression',
      `Day time went backwards: ${lastSnap.day_time_ms}ms → ${stats.dayTimeMs}ms — possible server restart`,
      db,
    );
  }
}

export function validateFarms(feed: FarmsFeed, db: Database = defaultDb): void {
  for (const farm of feed.farms) {
    const prev = db
      .prepare(`SELECT money FROM farms WHERE farm_id = ?`)
      .get(farm.farmId) as { money: number } | undefined;

    if (prev && Math.abs(farm.money - prev.money) > 500_000) {
      insertDataAlert(
        'ftp',
        'balance_sanity',
        `Farm ${farm.farmId} ("${farm.name}") balance changed by $${Math.abs(farm.money - prev.money).toFixed(0)} in one poll`,
        db,
      );
    }
  }
}

export function validateFields(feed: FieldsFeed, db: Database = defaultDb): void {
  const prevCount = (
    db.prepare(`SELECT COUNT(*) AS n FROM fields`).get() as { n: number }
  ).n;

  if (prevCount > 0 && prevCount - feed.fields.length > 5) {
    insertDataAlert(
      'ftp',
      'field_count_drop',
      `Field count dropped from ${prevCount} to ${feed.fields.length} in one poll`,
      db,
    );
  }
}

export function validateVehicles(feed: VehiclesFeed, db: Database = defaultDb): void {
  const knownFarmIds = new Set(
    (db.prepare(`SELECT farm_id FROM farms`).all() as { farm_id: number }[]).map((r) => r.farm_id),
  );

  const ignoredRow = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'ignoredFarmIds'`)
    .get() as { value: string } | undefined;
  const ignoredFarmIds = new Set<number>(ignoredRow ? JSON.parse(ignoredRow.value) : [2]);

  for (const v of feed.vehicles) {
    if (v.farmId !== 0 && !knownFarmIds.has(v.farmId) && !ignoredFarmIds.has(v.farmId)) {
      insertDataAlert(
        'http',
        'vehicle_farm_mismatch',
        `Vehicle "${v.name}" (${v.uniqueId}) has farmId=${v.farmId} which is not a known farm`,
        db,
      );
    }
  }
}
