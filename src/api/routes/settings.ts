import { Router } from 'express';
import type { Database } from 'better-sqlite3';

const EDITABLE_KEYS = new Set([
  'mapImageUrl',
  'httpPollIntervalSeconds',
  'ftpPollIntervalSeconds',
  'notificationsEnabled',
  'currencySymbol',
]);

export function createSettingsRouter(db: Database): Router {
  const router = Router();

  // GET /api/settings — all settings as flat object
  router.get('/', (_req, res) => {
    const rows = db
      .prepare('SELECT key, value FROM app_settings')
      .all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json(settings);
  });

  // PATCH /api/settings/:key — update a single setting value
  router.patch('/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body as { value: unknown };

    if (!EDITABLE_KEYS.has(key)) {
      res.status(400).json({ error: `Setting '${key}' is not editable via API` });
      return;
    }

    const existing = db
      .prepare('SELECT key FROM app_settings WHERE key = ?')
      .get(key) as { key: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: `Unknown setting: ${key}` });
      return;
    }

    const stringValue = value === null || value === undefined ? 'null' : String(value);
    db.prepare('UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?').run(
      stringValue,
      new Date().toISOString(),
      key,
    );

    res.json({ key, value: stringValue });
  });

  return router;
}
