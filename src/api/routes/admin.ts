import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { broadcast } from '../sseManager';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

// Tables cleared on reset, in dependency order (children before parents).
// app_settings and recurring_task_templates are intentionally excluded.
const RESET_TABLES = [
  'notifications',
  'data_quality_alerts',
  'task_claims',
  'tasks',
  'server_goals',
  'farmland_price_history',
  'farmland_precision_stats',
  'farm_players',
  'farm_statistics_snapshots',
  'farm_finance_snapshots',
  'invoices',
  'sales_market',
  'vehicles',
  'farmlands',
  'fields',
  'environment_snapshots',
  'server_snapshots',
  'players',
  'farms',
  'poller_health',
];

export function createAdminRouter(db: Database): Router {
  const router = Router();

  // POST /api/admin/reset — wipe all game state for a new playthrough.
  // Preserves: app_settings, recurring_task_templates.
  router.post('/reset', (_req, res) => {
    const cleared: Record<string, number> = {};

    const doReset = db.transaction(() => {
      for (const table of RESET_TABLES) {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        cleared[table] = result.changes;
      }
    });

    try {
      doReset();
    } catch (err) {
      res.status(500).json({ error: `Reset failed: ${(err as Error).message}` });
      return;
    }

    // Remove any cached map image so the new map can be re-fetched or re-uploaded
    const mapPath = path.join(DATA_DIR, 'map-image');
    const mimePath = path.join(DATA_DIR, 'map-image.mime');
    if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
    if (fs.existsSync(mimePath)) fs.unlinkSync(mimePath);

    console.log('[admin] Playthrough reset — game state cleared');
    broadcast('playthrough-reset', { cleared });

    res.json({ ok: true, cleared });
  });

  return router;
}
