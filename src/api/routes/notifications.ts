import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getRecentAlerts, deleteAlert } from '../../notifications/alertManager';

export function createNotificationsRouter(db: Database): Router {
  const router = Router();

  // GET /api/notifications — recent alerts (last 7 days), newest first
  router.get('/', (_req, res) => {
    res.json(getRecentAlerts(db));
  });

  // DELETE /api/notifications/:id — remove a single notification
  router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const deleted = deleteAlert(db, id);
    if (deleted) {
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  });

  // DELETE /api/notifications — clear all notifications
  router.delete('/', (_req, res) => {
    db.prepare(`DELETE FROM notifications`).run();
    res.json({ ok: true });
  });

  return router;
}
