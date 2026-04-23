import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { broadcast } from '../sseManager';
import { generateTaskFromTemplateId } from '../../tasks/templateEngine';

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export function createTasksRouter(db: Database): Router {
  const router = Router();

  // 5.17 — GET /api/tasks (filterable by farmId, status, category)
  router.get('/', (req, res) => {
    const { farmId, status, category } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (farmId) {
      conditions.push('t.farm_id = ?');
      params.push(parseInt(farmId as string, 10));
    }
    if (status) {
      conditions.push('t.status = ?');
      params.push((status as string).toUpperCase());
    }
    if (category) {
      conditions.push('t.category = ?');
      params.push(category);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db
      .prepare(
        `SELECT t.*, tc.player_nickname AS claimed_by, tc.claimed_at
         FROM tasks t
         LEFT JOIN task_claims tc ON tc.task_id = t.id
         ${where}
         ORDER BY
           CASE t.status WHEN 'OPEN' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END,
           CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
           t.created_at DESC`,
      )
      .all(...params) as Record<string, unknown>[];

    res.json(rows);
  });

  // 5.18 — POST /api/tasks
  router.post('/', (req, res) => {
    const { farmId, title, description, category, priority, dueDate, createdByNickname } =
      req.body as Record<string, unknown>;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO tasks (farm_id, title, description, category, priority, status, due_date, created_by_nickname, created_at)
         VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)`,
      )
      .run(
        farmId ?? null,
        title.trim(),
        description ?? null,
        category ?? null,
        VALID_PRIORITIES.includes((priority as string)?.toUpperCase())
          ? (priority as string).toUpperCase()
          : 'MEDIUM',
        dueDate ?? null,
        createdByNickname ?? null,
        now,
      );

    const task = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(result.lastInsertRowid) as Record<string, unknown>;

    broadcast('task-update', { action: 'created', task });
    res.status(201).json(task);
  });

  // 6.6 — GET /api/tasks/templates
  router.get('/templates', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM recurring_task_templates ORDER BY id`)
      .all() as Record<string, unknown>[];
    res.json(rows);
  });

  // 6.6 — POST /api/tasks/templates
  router.post('/templates', (req, res) => {
    const { farmId, title, description, category, priority, triggerType, triggerValue } =
      req.body as Record<string, unknown>;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO recurring_task_templates (farm_id, title, description, category, priority, trigger_type, trigger_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        farmId ?? null,
        title.trim(),
        description ?? null,
        category ?? null,
        VALID_PRIORITIES.includes((priority as string)?.toUpperCase())
          ? (priority as string).toUpperCase()
          : 'MEDIUM',
        triggerType ?? null,
        triggerValue ? JSON.stringify(triggerValue) : null,
      );

    const template = db
      .prepare(`SELECT * FROM recurring_task_templates WHERE id = ?`)
      .get(result.lastInsertRowid) as Record<string, unknown>;

    res.status(201).json(template);
  });

  // 6.6 — DELETE /api/tasks/templates/:id
  router.delete('/templates/:id', (req, res) => {
    const templateId = parseInt(req.params.id, 10);

    const existing = db
      .prepare(`SELECT id FROM recurring_task_templates WHERE id = ?`)
      .get(templateId);
    if (!existing) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    db.prepare(`DELETE FROM recurring_task_templates WHERE id = ?`).run(templateId);
    res.status(204).send();
  });

  // 6.6 — POST /api/tasks/templates/:id/generate (manual trigger)
  router.post('/templates/:id/generate', (req, res) => {
    const templateId = parseInt(req.params.id, 10);
    const context = (req.body as Record<string, unknown>) ?? {};

    const template = db
      .prepare(`SELECT * FROM recurring_task_templates WHERE id = ?`)
      .get(templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const count = generateTaskFromTemplateId(templateId, context, db);
    const latestTask = db
      .prepare(`SELECT * FROM tasks ORDER BY id DESC LIMIT 1`)
      .get() as Record<string, unknown>;

    res.json({ generated: count, task: count > 0 ? latestTask : null });
  });

  // 5.19 — PATCH /api/tasks/:id/claim
  router.patch('/:id/claim', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { playerNickname } = req.body as Record<string, unknown>;

    if (!playerNickname || typeof playerNickname !== 'string') {
      res.status(400).json({ error: 'playerNickname is required' });
      return;
    }

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as
      | Record<string, unknown>
      | undefined;
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const existing = db
      .prepare(`SELECT * FROM task_claims WHERE task_id = ?`)
      .get(taskId) as Record<string, unknown> | undefined;
    if (existing) {
      res.status(409).json({ error: 'Task already claimed', claimedBy: existing.player_nickname });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`INSERT INTO task_claims (task_id, player_nickname, claimed_at) VALUES (?, ?, ?)`)
      .run(taskId, playerNickname, now);

    db.prepare(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ? AND status = 'OPEN'`).run(
      taskId,
    );

    const updated = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(taskId) as Record<string, unknown>;
    broadcast('task-update', { action: 'claimed', task: updated, claimedBy: playerNickname });
    res.json(updated);
  });

  // 6.2 — PATCH /api/tasks/:id/unclaim
  router.patch('/:id/unclaim', (req, res) => {
    const taskId = parseInt(req.params.id, 10);

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as
      | Record<string, unknown>
      | undefined;
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const claim = db
      .prepare(`SELECT * FROM task_claims WHERE task_id = ?`)
      .get(taskId) as Record<string, unknown> | undefined;
    if (!claim) {
      res.status(400).json({ error: 'Task is not claimed' });
      return;
    }

    db.prepare(`DELETE FROM task_claims WHERE task_id = ?`).run(taskId);
    db.prepare(`UPDATE tasks SET status = 'OPEN' WHERE id = ? AND status = 'IN_PROGRESS'`).run(
      taskId,
    );

    const updated = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(taskId) as Record<string, unknown>;
    broadcast('task-update', { action: 'unclaimed', task: updated });
    res.json(updated);
  });

  // 5.20 — PATCH /api/tasks/:id/status
  router.patch('/:id/status', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body as Record<string, unknown>;

    if (!status || !VALID_STATUSES.includes((status as string).toUpperCase())) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as
      | Record<string, unknown>
      | undefined;
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const newStatus = (status as string).toUpperCase();
    const completedAt = newStatus === 'DONE' ? new Date().toISOString() : null;

    db.prepare(`UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`).run(
      newStatus,
      completedAt,
      taskId,
    );

    const updated = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(taskId) as Record<string, unknown>;
    broadcast('task-update', { action: 'status_changed', task: updated });
    res.json(updated);
  });

  return router;
}
