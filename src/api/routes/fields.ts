import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createFieldsRouter(db: Database): Router {
  const router = Router();

  // 5.13 — GET /api/fields
  router.get('/', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM fields ORDER BY field_id`)
      .all() as Record<string, unknown>[];
    res.json(rows);
  });

  return router;
}
