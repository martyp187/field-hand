import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createGoalsRouter(db: Database): Router {
  const router = Router();

  // 5.21 — GET /api/goals
  router.get('/', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM server_goals ORDER BY status, created_at DESC`)
      .all() as Record<string, unknown>[];
    res.json(rows);
  });

  return router;
}
