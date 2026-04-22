import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createPlayersRouter(db: Database): Router {
  const router = Router();

  // 5.11 — GET /api/players
  router.get('/', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT p.*, fp.farm_id, fp.farm_manager, f.name AS farm_name
         FROM players p
         LEFT JOIN farm_players fp ON fp.unique_user_id = p.unique_user_id
         LEFT JOIN farms f ON f.farm_id = fp.farm_id
         ORDER BY p.time_last_connected DESC`,
      )
      .all() as Record<string, unknown>[];
    res.json(rows);
  });

  // 5.12 — GET /api/players/:nickname/tasks
  router.get('/:nickname/tasks', (req, res) => {
    const { nickname } = req.params;
    const rows = db
      .prepare(
        `SELECT t.*, tc.claimed_at
         FROM tasks t
         LEFT JOIN task_claims tc ON tc.task_id = t.id
         WHERE tc.player_nickname = ?
         ORDER BY t.created_at DESC`,
      )
      .all(nickname) as Record<string, unknown>[];
    res.json(rows);
  });

  return router;
}
