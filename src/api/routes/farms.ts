import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createFarmsRouter(db: Database): Router {
  const router = Router();

  // 5.5 — GET /api/farms
  router.get('/', (_req, res) => {
    const farms = db
      .prepare(
        `SELECT f.*,
           (SELECT COUNT(*) FROM farm_players WHERE farm_id = f.farm_id) AS player_count
         FROM farms f
         ORDER BY f.farm_id`,
      )
      .all() as Record<string, unknown>[];
    res.json(farms);
  });

  // 5.6 — GET /api/farms/:id
  router.get('/:id', (req, res) => {
    const farmId = parseInt(req.params.id, 10);
    const farm = db
      .prepare(`SELECT * FROM farms WHERE farm_id = ?`)
      .get(farmId) as Record<string, unknown> | undefined;

    if (!farm) {
      res.status(404).json({ error: 'Farm not found' });
      return;
    }

    const players = db
      .prepare(
        `SELECT fp.*, p.last_nickname, p.time_last_connected
         FROM farm_players fp
         LEFT JOIN players p ON p.unique_user_id = fp.unique_user_id
         WHERE fp.farm_id = ?`,
      )
      .all(farmId) as Record<string, unknown>[];

    res.json({ ...farm, players });
  });

  // 5.7 — GET /api/farms/:id/finances
  router.get('/:id/finances', (req, res) => {
    const farmId = parseInt(req.params.id, 10);
    const rows = db
      .prepare(
        `SELECT * FROM farm_finance_snapshots
         WHERE farm_id = ?
         ORDER BY in_game_day DESC`,
      )
      .all(farmId) as Record<string, unknown>[];
    res.json(rows);
  });

  // 5.8 — GET /api/farms/:id/statistics
  router.get('/:id/statistics', (req, res) => {
    const farmId = parseInt(req.params.id, 10);
    const rows = db
      .prepare(
        `SELECT * FROM farm_statistics_snapshots
         WHERE farm_id = ?
         ORDER BY id DESC
         LIMIT 20`,
      )
      .all(farmId) as Record<string, unknown>[];
    res.json(rows);
  });

  // 5.9 — GET /api/farms/:id/fields
  // Returns farmlands owned by this farm — these are the land parcels players manage
  router.get('/:id/fields', (req, res) => {
    const farmId = parseInt(req.params.id, 10);
    const rows = db
      .prepare(
        `SELECT fl.*, fps.period_counter_json, fps.total_counter_json
         FROM farmlands fl
         LEFT JOIN farmland_precision_stats fps ON fps.farmland_id = fl.farmland_id
         WHERE fl.owner_farm_id = ?
         ORDER BY fl.farmland_id`,
      )
      .all(farmId) as Record<string, unknown>[];

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

  // 5.10 — GET /api/farms/:id/vehicles
  router.get('/:id/vehicles', (req, res) => {
    const farmId = parseInt(req.params.id, 10);
    const rows = db
      .prepare(`SELECT * FROM vehicles WHERE farm_id = ? ORDER BY name`)
      .all(farmId) as Record<string, unknown>[];

    const result = rows.map((v) => {
      const out = { ...v };
      if (out.fills_json) {
        out.fills = JSON.parse(out.fills_json as string);
        delete out.fills_json;
      }
      if (out.attached_vehicle_ids_json) {
        out.attachedVehicleIds = JSON.parse(out.attached_vehicle_ids_json as string);
        delete out.attached_vehicle_ids_json;
      }
      return out;
    });

    res.json(result);
  });

  return router;
}
