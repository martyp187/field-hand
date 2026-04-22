import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createServerRouter(db: Database): Router {
  const router = Router();

  // 5.3 — GET /api/server/status
  router.get('/status', (_req, res) => {
    const snapshot = db
      .prepare(`SELECT * FROM server_snapshots ORDER BY id DESC LIMIT 1`)
      .get() as Record<string, unknown> | undefined;

    const health = db
      .prepare(`SELECT * FROM poller_health`)
      .all() as Record<string, unknown>[];

    res.json({ snapshot: snapshot ?? null, pollerHealth: health });
  });

  // 5.4 — GET /api/server/weather
  router.get('/weather', (_req, res) => {
    const env = db
      .prepare(`SELECT * FROM environment_snapshots ORDER BY id DESC LIMIT 1`)
      .get() as Record<string, unknown> | undefined;

    if (!env) {
      res.status(404).json({ error: 'No environment data available' });
      return;
    }

    if (env.weather_forecast_json) {
      env.weatherForecast = JSON.parse(env.weather_forecast_json as string);
      delete env.weather_forecast_json;
    }

    res.json(env);
  });

  return router;
}
