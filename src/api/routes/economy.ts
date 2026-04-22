import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createEconomyRouter(db: Database): Router {
  const router = Router();

  // 5.15 — GET /api/economy/prices
  router.get('/prices', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM economy_prices ORDER BY fill_type, period_name`)
      .all() as Record<string, unknown>[];

    // Group by fill_type for a more usable response shape
    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const row of rows) {
      const ft = row.fill_type as string;
      if (!grouped[ft]) grouped[ft] = [];
      grouped[ft].push(row);
    }

    res.json(grouped);
  });

  return router;
}
