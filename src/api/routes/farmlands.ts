import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createFarmlandsRouter(db: Database): Router {
  const router = Router();

  // 5.14 — GET /api/farmlands
  router.get('/', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT fl.*, f.name AS owner_farm_name,
           fps.period_counter_json, fps.total_counter_json
         FROM farmlands fl
         LEFT JOIN farms f ON f.farm_id = fl.owner_farm_id
         LEFT JOIN farmland_precision_stats fps ON fps.farmland_id = fl.farmland_id
         ORDER BY fl.farmland_id`,
      )
      .all() as Record<string, unknown>[];

    const result = rows.map((r) => {
      const out = { ...r };
      if (out.period_counter_json) {
        out.periodStats = JSON.parse(out.period_counter_json as string);
        delete out.period_counter_json;
      }
      if (out.total_counter_json) {
        out.totalStats = JSON.parse(out.total_counter_json as string);
        delete out.total_counter_json;
      }
      return out;
    });

    res.json(result);
  });

  return router;
}
