import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { EnvironmentFeed } from '../../types/environment';

export function writeEnvironment(feed: EnvironmentFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO environment_snapshots (
      snapshot_time, current_day, current_monotonic_day, season,
      day_time, time_since_last_rain, weather_forecast_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    now,
    feed.currentDay,
    feed.currentMonotonicDay,
    feed.currentSeason,
    feed.dayTime,
    feed.timeSinceLastRain,
    JSON.stringify(feed.forecast),
  );
}
