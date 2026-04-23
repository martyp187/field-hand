import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import db from './db/connection';
import { initSchema, seedSettings } from './db/schema';
import { downloadFtpFiles, downloadSingleFile } from './poller/ftpDownloader';
import { fetchEndpoint } from './poller/httpFetcher';
import { parseSavegame } from './parser/savegameParser';
import { parseStats } from './parser/statsParser';
import { PollerService } from './poller/pollerService';
import { scheduleNightlyArchival } from './poller/archivalJob';
import { updatePollerHealth } from './poller/pollerHealth';
import { createApiRouter } from './api/router';

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const APP_PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000;

// Source labels for startup summary
const sources: Record<string, 'GREEN' | 'AMBER' | 'RED'> = {};

function mark(src: string, status: 'GREEN' | 'AMBER' | 'RED') {
  sources[src] = status;
}

function statusLine(src: string): string {
  const s = sources[src] ?? 'RED';
  const icon = s === 'GREEN' ? '✓' : s === 'AMBER' ? '⚠' : '✗';
  return `  ${icon} ${src.padEnd(20)} ${s}`;
}

async function bootstrap(): Promise<void> {
  console.log('[boot] FS25 Farm Companion starting…');

  // Step 3 — Init database schema + seed settings
  initSchema(db);
  seedSettings(db);

  const settingRow = (key: string, fallback: string): string => {
    const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? fallback;
  };

  const httpIntervalSeconds = parseInt(settingRow('httpPollIntervalSeconds', '60'), 10);
  const defaultFtpInterval = parseInt(settingRow('ftpPollIntervalSeconds', '180'), 10);

  let ftpIntervalSeconds = defaultFtpInterval;

  // Step 4 — FTP connectivity
  const ftpFiles = config.ftp?.files ?? {};
  const expectedFtpKeys = Object.keys(ftpFiles);
  try {
    const listing = await downloadFtpFiles(['farms']); // lightweight check
    if (listing.length > 0) {
      mark('ftp_connect', 'GREEN');
    } else {
      mark('ftp_connect', 'AMBER');
    }
  } catch (err) {
    console.error('[boot] FTP connection failed:', (err as Error).message);
    mark('ftp_connect', 'RED');
    updatePollerHealth('ftp', false, (err as Error).message);
  }

  // Step 5 — Read autoSaveInterval from careerSavegame.xml
  try {
    const xml = await downloadSingleFile('careerSavegame');
    const savegame = await parseSavegame(xml);
    ftpIntervalSeconds = savegame.autoSaveInterval;
    console.log(`[boot] autoSaveInterval = ${ftpIntervalSeconds}s (from careerSavegame.xml)`);
    mark('careerSavegame', 'GREEN');
  } catch (err) {
    console.warn(
      `[boot] Could not read careerSavegame.xml, using default FTP interval (${ftpIntervalSeconds}s):`,
      (err as Error).message,
    );
    mark('careerSavegame', 'AMBER');
  }

  // Step 6 — HTTP connectivity check
  try {
    const xml = await fetchEndpoint('stats');
    const stats = await parseStats(xml);
    console.log(
      `[boot] Server live: "${stats.serverName}" — ${stats.slots.numUsed}/${stats.slots.capacity} players`,
    );
    mark('http_stats', 'GREEN');
    updatePollerHealth('http', true);
  } catch (err) {
    console.error('[boot] HTTP stats fetch failed:', (err as Error).message);
    mark('http_stats', 'RED');
    updatePollerHealth('http', false, (err as Error).message);
  }

  // Step 6.5 — Fetch and cache map overview image from config.mapImageUrl
  const configMapUrl = config.mapImageUrl as string | undefined;
  if (configMapUrl) {
    const MAP_IMAGE_PATH = path.resolve(__dirname, '..', 'data', 'map-image');
    const MAP_IMAGE_MIME_PATH = path.resolve(__dirname, '..', 'data', 'map-image.mime');
    try {
      const imgRes = await fetch(configMapUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(MAP_IMAGE_PATH, buf);
        fs.writeFileSync(MAP_IMAGE_MIME_PATH, imgRes.headers.get('content-type') ?? 'image/jpeg');
        console.log(`[boot] Map image cached (${(buf.length / 1024).toFixed(0)} KB)`);
        mark('map_image', 'GREEN');
      } else {
        console.warn(`[boot] Map image fetch: HTTP ${imgRes.status}`);
        mark('map_image', 'AMBER');
      }
    } catch (err) {
      console.warn(`[boot] Map image fetch failed: ${(err as Error).message}`);
      mark('map_image', 'AMBER');
    }
  }

  // Step 7–8 — Validate expected FTP files present
  const missingKeys: string[] = [];
  for (const key of expectedFtpKeys) {
    if (!ftpFiles[key]) missingKeys.push(key);
  }
  if (missingKeys.length === 0) {
    mark('ftp_files', 'GREEN');
  } else {
    console.warn(`[boot] Missing FTP file config keys: ${missingKeys.join(', ')}`);
    mark('ftp_files', 'AMBER');
  }

  // Step 9–10 — Start pollers
  const poller = new PollerService(httpIntervalSeconds, ftpIntervalSeconds, db);
  poller.start();

  // Step 11 — Express app
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api', createApiRouter(db));

  // Serve the built Vite client in production
  const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    // SPA fallback — send index.html for any non-API route
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  // Nightly archival
  scheduleNightlyArchival(db);

  app.listen(APP_PORT, () => {
    // Step 12 — Startup summary
    console.log('\n' + '─'.repeat(50));
    console.log('  FS25 Farm Companion — Startup Summary');
    console.log('─'.repeat(50));
    console.log(statusLine('ftp_connect'));
    console.log(statusLine('careerSavegame'));
    console.log(statusLine('http_stats'));
    console.log(statusLine('ftp_files'));
    if (configMapUrl) console.log(statusLine('map_image'));
    console.log('─'.repeat(50));
    console.log(`  HTTP poll:  every ${httpIntervalSeconds}s`);
    console.log(`  FTP poll:   every ${ftpIntervalSeconds}s`);
    console.log(`  API port:   ${APP_PORT}`);
    console.log('─'.repeat(50) + '\n');
  });
}

bootstrap().catch((err) => {
  console.error('[boot] Fatal startup error:', err);
  process.exit(1);
});
