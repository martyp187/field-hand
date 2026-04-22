import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createMarketRouter(db: Database): Router {
  const router = Router();

  // 5.16 — GET /api/market/vehicles
  router.get('/vehicles', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM sales_market ORDER BY price DESC`)
      .all() as Record<string, unknown>[];
    res.json(rows);
  });

  return router;
}
