import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { broadcast } from '../sseManager';

const VALID_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

export function createGoalsRouter(db: Database): Router {
  const router = Router();

  // 5.21 — GET /api/goals
  router.get('/', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM server_goals ORDER BY status, created_at DESC`)
      .all() as Record<string, unknown>[];
    res.json(rows);
  });

  // 6.5 — POST /api/goals
  router.post('/', (req, res) => {
    const { title, description, targetValue, unit } = req.body as Record<string, unknown>;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO server_goals (title, description, target_value, unit, status, created_at)
         VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      )
      .run(
        title.trim(),
        description ?? null,
        typeof targetValue === 'number' ? targetValue : null,
        unit ?? null,
        now,
      );

    const goal = db
      .prepare(`SELECT * FROM server_goals WHERE id = ?`)
      .get(result.lastInsertRowid) as Record<string, unknown>;

    broadcast('goal-update', { action: 'created', goal });
    res.status(201).json(goal);
  });

  // 6.5 — PATCH /api/goals/:id/progress
  router.patch('/:id/progress', (req, res) => {
    const goalId = parseInt(req.params.id, 10);
    const { currentValue } = req.body as Record<string, unknown>;

    if (typeof currentValue !== 'number') {
      res.status(400).json({ error: 'currentValue must be a number' });
      return;
    }

    const goal = db.prepare(`SELECT * FROM server_goals WHERE id = ?`).get(goalId) as
      | Record<string, unknown>
      | undefined;
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const now = new Date().toISOString();
    const targetValue = goal.target_value as number | null;
    const isNowComplete = targetValue !== null && currentValue >= targetValue;
    const newStatus = isNowComplete ? 'COMPLETED' : (goal.status as string);
    const completedAt = isNowComplete && !goal.completed_at ? now : (goal.completed_at ?? null);

    db.prepare(
      `UPDATE server_goals SET current_value = ?, status = ?, completed_at = ? WHERE id = ?`,
    ).run(currentValue, newStatus, completedAt, goalId);

    const updated = db
      .prepare(`SELECT * FROM server_goals WHERE id = ?`)
      .get(goalId) as Record<string, unknown>;

    broadcast('goal-update', { action: isNowComplete ? 'completed' : 'progress', goal: updated });
    res.json(updated);
  });

  // 6.5 — PATCH /api/goals/:id/status
  router.patch('/:id/status', (req, res) => {
    const goalId = parseInt(req.params.id, 10);
    const { status } = req.body as Record<string, unknown>;

    if (!status || !VALID_STATUSES.includes((status as string).toUpperCase())) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const goal = db.prepare(`SELECT * FROM server_goals WHERE id = ?`).get(goalId) as
      | Record<string, unknown>
      | undefined;
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const newStatus = (status as string).toUpperCase();
    const now = new Date().toISOString();
    const completedAt =
      newStatus === 'COMPLETED' ? now : (goal.completed_at as string | null) ?? null;

    db.prepare(`UPDATE server_goals SET status = ?, completed_at = ? WHERE id = ?`).run(
      newStatus,
      completedAt,
      goalId,
    );

    const updated = db
      .prepare(`SELECT * FROM server_goals WHERE id = ?`)
      .get(goalId) as Record<string, unknown>;

    broadcast('goal-update', { action: 'status_changed', goal: updated });
    res.json(updated);
  });

  return router;
}
