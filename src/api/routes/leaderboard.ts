import { Router } from 'express';
import type { Database } from 'better-sqlite3';

export function createLeaderboardRouter(db: Database): Router {
  const router = Router();

  // GET /api/leaderboard — four leaderboard categories in one query
  router.get('/', (_req, res) => {
    // 1. Most land (ha) per farm
    const mostLand = db
      .prepare(
        `SELECT f.farm_id, f.name, f.colour_hex,
                COALESCE(SUM(fl.area_ha), 0) AS total_ha
         FROM farms f
         LEFT JOIN farmlands fl ON fl.owner_farm_id = f.farm_id
         GROUP BY f.farm_id
         ORDER BY total_ha DESC`,
      )
      .all() as { farm_id: number; name: string; colour_hex: string | null; total_ha: number }[];

    // 2. Richest farm (current money balance)
    const richest = db
      .prepare(
        `SELECT farm_id, name, colour_hex, COALESCE(money, 0) AS money
         FROM farms
         ORDER BY money DESC`,
      )
      .all() as { farm_id: number; name: string; colour_hex: string | null; money: number }[];

    // 3. Total vehicle operating hours per farm
    const vehicleHours = db
      .prepare(
        `SELECT f.farm_id, f.name, f.colour_hex,
                COALESCE(SUM(v.operating_time), 0) AS total_hours
         FROM farms f
         LEFT JOIN vehicles v ON v.farm_id = f.farm_id AND v.property_state = 'OWNED'
         GROUP BY f.farm_id
         ORDER BY total_hours DESC`,
      )
      .all() as { farm_id: number; name: string; colour_hex: string | null; total_hours: number }[];

    // 4. Tasks completed per player nickname (via task_claims on DONE tasks)
    const tasksDone = db
      .prepare(
        `SELECT tc.player_nickname AS nickname,
                fp.farm_id,
                f.colour_hex,
                COUNT(*) AS count
         FROM task_claims tc
         JOIN tasks t ON t.id = tc.task_id AND t.status = 'DONE'
         LEFT JOIN farm_players fp ON fp.last_nickname = tc.player_nickname
         LEFT JOIN farms f ON f.farm_id = fp.farm_id
         GROUP BY tc.player_nickname
         ORDER BY count DESC`,
      )
      .all() as {
      nickname: string;
      farm_id: number | null;
      colour_hex: string | null;
      count: number;
    }[];

    res.json({ mostLand, richest, vehicleHours, tasksDone });
  });

  return router;
}
