import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');
const CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'config.json');
const MAP_IMAGE_PATH = path.join(DATA_DIR, 'map-image');

// Multer stores the upload as data/map-image (no extension; content-type is preserved separately)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DATA_DIR),
    filename: (_req, _file, cb) => cb(null, 'map-image'),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  },
});

// Store the mime type of the uploaded file alongside it
const MAP_IMAGE_MIME_PATH = path.join(DATA_DIR, 'map-image.mime');

function localImageExists(): boolean {
  return fs.existsSync(MAP_IMAGE_PATH);
}

function localImageMime(): string {
  try {
    return fs.readFileSync(MAP_IMAGE_MIME_PATH, 'utf-8').trim();
  } catch {
    return 'image/jpeg';
  }
}

export function createServerRouter(db: Database): Router {
  const router = Router();

  // 5.3 — GET /api/server/status
  router.get('/status', (_req, res) => {
    const snapshot = db
      .prepare(`SELECT * FROM server_snapshots ORDER BY id DESC LIMIT 1`)
      .get() as Record<string, unknown> | undefined;

    const health = db
      .prepare(`SELECT * FROM poller_health`)
      .all() as Record<string, unknown>[];

    res.json({ snapshot: snapshot ?? null, pollerHealth: health });
  });

  // GET /api/server/map-image — serve local cache, or proxy from DB/config URL
  router.get('/map-image', async (_req, res) => {
    // 1. Local file (uploaded or cached at startup) takes priority
    if (localImageExists()) {
      res.setHeader('Content-Type', localImageMime());
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.sendFile(MAP_IMAGE_PATH);
      return;
    }

    // 2. DB setting
    const dbRow = db
      .prepare("SELECT value FROM app_settings WHERE key = 'mapImageUrl'")
      .get() as { value: string } | undefined;
    const dbUrl = dbRow?.value;

    // 3. config.json fallback
    let configUrl: string | undefined;
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as { mapImageUrl?: string };
      configUrl = cfg.mapImageUrl;
    } catch { /* ignore */ }

    const proxyUrl = (dbUrl && dbUrl !== 'null' && dbUrl.trim()) ? dbUrl : configUrl;

    if (!proxyUrl) {
      res.status(404).json({ error: 'No map image configured. Upload one or set a URL in Settings.' });
      return;
    }

    try {
      const upstream = await fetch(proxyUrl);
      if (!upstream.ok) {
        res.status(502).json({ error: `Upstream returned ${upstream.status}` });
        return;
      }
      const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Cache it locally so future requests are served from disk
      const buffer = await upstream.arrayBuffer();
      const buf = Buffer.from(buffer);
      fs.writeFileSync(MAP_IMAGE_PATH, buf);
      fs.writeFileSync(MAP_IMAGE_MIME_PATH, contentType);
      res.send(buf);
    } catch (err) {
      res.status(502).json({ error: `Could not fetch map image: ${(err as Error).message}` });
    }
  });

  // POST /api/server/map-image — upload a map image file
  // Multer is called with an explicit callback so errors are returned as JSON,
  // not passed to Express's default HTML error handler.
  router.post('/map-image', (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }
      fs.writeFileSync(MAP_IMAGE_MIME_PATH, req.file.mimetype);
      res.json({ ok: true, size: req.file.size, mimetype: req.file.mimetype });
    });
  });

  // DELETE /api/server/map-image — remove uploaded file (fall back to URL)
  router.delete('/map-image', (_req, res) => {
    if (localImageExists()) {
      fs.unlinkSync(MAP_IMAGE_PATH);
      if (fs.existsSync(MAP_IMAGE_MIME_PATH)) fs.unlinkSync(MAP_IMAGE_MIME_PATH);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: 'No uploaded image to remove' });
    }
  });

  // GET /api/server/map-image/status — tells the client which source is active
  router.get('/map-image/status', (_req, res) => {
    if (localImageExists()) {
      res.json({ source: 'upload', mime: localImageMime() });
      return;
    }
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = 'mapImageUrl'")
      .get() as { value: string } | undefined;
    const dbUrl = row?.value;
    if (dbUrl && dbUrl !== 'null' && dbUrl.trim()) {
      res.json({ source: 'url', url: dbUrl });
      return;
    }
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as { mapImageUrl?: string };
      if (cfg.mapImageUrl) {
        res.json({ source: 'url', url: cfg.mapImageUrl });
        return;
      }
    } catch { /* ignore */ }
    res.json({ source: 'none' });
  });

  // 5.4 — GET /api/server/weather
  router.get('/weather', (_req, res) => {
    const env = db
      .prepare(`SELECT * FROM environment_snapshots ORDER BY id DESC LIMIT 1`)
      .get() as Record<string, unknown> | undefined;

    if (!env) {
      res.status(404).json({ error: 'No environment data available' });
      return;
    }

    if (env.weather_forecast_json) {
      env.weatherForecast = JSON.parse(env.weather_forecast_json as string);
      delete env.weather_forecast_json;
    }

    res.json(env);
  });

  return router;
}
