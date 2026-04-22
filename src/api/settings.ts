import type { Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let _config: Record<string, unknown> | null = null;

function loadConfig(): Record<string, unknown> {
  if (!_config) {
    _config = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', '..', 'config.json'), 'utf-8'),
    );
  }
  return _config as Record<string, unknown>;
}

// Resolution order: DB app_settings → config.json → process.env → hardcoded fallback
export function resolveSetting(key: string, fallback: string, db: Database): string {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  if (row !== undefined && row.value !== null) return row.value;

  const config = loadConfig();
  if (key in config && config[key] !== null && config[key] !== undefined) {
    return String(config[key]);
  }

  const envKey = `FS25_${key.toUpperCase()}`;
  if (process.env[envKey]) return process.env[envKey] as string;

  return fallback;
}

export function resolveSettingJson<T>(key: string, fallback: T, db: Database): T {
  const raw = resolveSetting(key, JSON.stringify(fallback), db);
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
