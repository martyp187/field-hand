import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createPollerRouter(db: Database): Router {
  const router = Router();

  // 5.22 — GET /api/poller/health
  router.get('/health', (_req, res) => {
    const health = db
      .prepare(`SELECT * FROM poller_health ORDER BY source_name`)
      .all() as Record<string, unknown>[];

    const alerts = db
      .prepare(
        `SELECT * FROM data_quality_alerts
         WHERE resolved = 0
         ORDER BY alert_time DESC
         LIMIT 20`,
      )
      .all() as Record<string, unknown>[];

    res.json({ pollerHealth: health, unresolvedAlerts: alerts });
  });

  return router;
}
