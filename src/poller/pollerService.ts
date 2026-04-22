import type { Database } from 'better-sqlite3';
import defaultDb from '../db/connection';
import { fetchEndpoint } from './httpFetcher';
import { downloadFtpFiles } from './ftpDownloader';
import { parseStats } from '../parser/statsParser';
import { parseVehicles } from '../parser/vehiclesParser';
import { parseEconomy } from '../parser/economyParser';
import { parseFarms } from '../parser/farmsParser';
import { parseFields } from '../parser/fieldsParser';
import { parseEnvironment } from '../parser/environmentParser';
import { parsePlayers } from '../parser/playersParser';
import { parseInvoices } from '../parser/invoicesParser';
import { parseSales } from '../parser/salesParser';
import { writeServerSnapshot, writeFarmlands } from '../db/writers/serverWriter';
import { writeFarms } from '../db/writers/farmsWriter';
import { writeFields } from '../db/writers/fieldsWriter';
import { writeVehicles } from '../db/writers/vehiclesWriter';
import { writeEnvironment } from '../db/writers/environmentWriter';
import { writeEconomy } from '../db/writers/economyWriter';
import { writeInvoices } from '../db/writers/invoicesWriter';
import { writeSales } from '../db/writers/salesWriter';
import { updatePollerHealth, checkStaleAndAlert } from './pollerHealth';
import {
  validateServerStats,
  validateFarms,
  validateFields,
  validateVehicles,
} from './validators';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'config.json'), 'utf-8'),
);
const IGNORED_FARM_IDS: number[] = config.ignoredFarmIds ?? [2];
const FTP_KEYS = ['farms', 'fields', 'environment', 'players', 'invoices', 'sales'];

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: Error = new Error('No attempts made');
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err as Error;
      if (attempt < maxAttempts - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise<void>((r) => setTimeout(r, backoffMs));
        console.warn(`[poller] Retry ${attempt + 1}/${maxAttempts - 1}: ${lastErr.message}`);
      }
    }
  }
  throw lastErr;
}

export class PollerService {
  private _httpIntervalMs: number;
  private _ftpIntervalMs: number;
  private httpTimer: ReturnType<typeof setTimeout> | null = null;
  private ftpTimer: ReturnType<typeof setTimeout> | null = null;
  private _httpLocked = false;
  private _ftpLocked = false;
  private db: Database;

  constructor(
    httpIntervalSeconds: number,
    ftpIntervalSeconds: number,
    db: Database = defaultDb,
  ) {
    this._httpIntervalMs = httpIntervalSeconds * 1000;
    this._ftpIntervalMs = ftpIntervalSeconds * 1000;
    this.db = db;
  }

  get httpLocked(): boolean {
    return this._httpLocked;
  }
  get ftpLocked(): boolean {
    return this._ftpLocked;
  }
  get httpIntervalSeconds(): number {
    return this._httpIntervalMs / 1000;
  }
  get ftpIntervalSeconds(): number {
    return this._ftpIntervalMs / 1000;
  }

  setHttpInterval(seconds: number): void {
    this._httpIntervalMs = seconds * 1000;
    console.log(`[poller] HTTP interval updated to ${seconds}s`);
  }

  setFtpInterval(seconds: number): void {
    this._ftpIntervalMs = seconds * 1000;
    console.log(`[poller] FTP interval updated to ${seconds}s`);
  }

  start(): void {
    this.scheduleHttp();
    this.scheduleFtp();
    console.log(
      `[poller] Started — HTTP: ${this.httpIntervalSeconds}s  FTP: ${this.ftpIntervalSeconds}s`,
    );
  }

  stop(): void {
    if (this.httpTimer) clearTimeout(this.httpTimer);
    if (this.ftpTimer) clearTimeout(this.ftpTimer);
    this.httpTimer = null;
    this.ftpTimer = null;
    console.log('[poller] Stopped');
  }

  private scheduleHttp(): void {
    this.httpTimer = setTimeout(() => this.runHttp(), this._httpIntervalMs);
  }

  private scheduleFtp(): void {
    this.ftpTimer = setTimeout(() => this.runFtp(), this._ftpIntervalMs);
  }

  private async runHttp(): Promise<void> {
    if (this._httpLocked) {
      console.warn('[poller/http] Previous poll still running — skipping cycle');
      updatePollerHealth('http', false, 'Skipped: previous poll still running', this.db);
      this.scheduleHttp();
      return;
    }

    this._httpLocked = true;
    try {
      await withRetry(() => this.pollHttp());
    } catch (err) {
      console.error('[poller/http] All retries exhausted:', (err as Error).message);
      updatePollerHealth('http', false, (err as Error).message, this.db);
      checkStaleAndAlert('http', this.httpIntervalSeconds, this.db);
    } finally {
      this._httpLocked = false;
      this.scheduleHttp();
    }
  }

  private async runFtp(): Promise<void> {
    if (this._ftpLocked) {
      console.warn('[poller/ftp] Previous poll still running — skipping cycle');
      updatePollerHealth('ftp', false, 'Skipped: previous poll still running', this.db);
      this.scheduleFtp();
      return;
    }

    this._ftpLocked = true;
    try {
      await withRetry(() => this.pollFtp());
    } catch (err) {
      console.error('[poller/ftp] All retries exhausted:', (err as Error).message);
      updatePollerHealth('ftp', false, (err as Error).message, this.db);
      checkStaleAndAlert('ftp', this.ftpIntervalSeconds, this.db);
    } finally {
      this._ftpLocked = false;
      this.scheduleFtp();
    }
  }

  private async pollHttp(): Promise<void> {
    const [statsXml, vehiclesXml, economyXml] = await Promise.all([
      fetchEndpoint('stats'),
      fetchEndpoint('vehicles'),
      fetchEndpoint('economy'),
    ]);

    const [stats, vehicles, economy] = await Promise.all([
      parseStats(statsXml),
      parseVehicles(vehiclesXml),
      parseEconomy(economyXml),
    ]);

    validateServerStats(stats, this.db);
    validateVehicles(vehicles, this.db);

    writeServerSnapshot(stats, this.db);
    writeFarmlands(stats.farmlands, this.db);
    writeVehicles(vehicles, this.db);
    writeEconomy(economy, this.db);

    updatePollerHealth('http', true, undefined, this.db);
    console.log(`[poller/http] OK — ${stats.slots.numUsed}/${stats.slots.capacity} players online`);
  }

  private async pollFtp(): Promise<void> {
    const results = await downloadFtpFiles(FTP_KEYS);
    let processed = 0;

    for (const { key, content } of results) {
      try {
        switch (key) {
          case 'farms': {
            const feed = await parseFarms(content, IGNORED_FARM_IDS);
            validateFarms(feed, this.db);
            writeFarms(feed, this.db);
            break;
          }
          case 'fields': {
            const feed = await parseFields(content);
            validateFields(feed, this.db);
            writeFields(feed, this.db);
            break;
          }
          case 'environment': {
            writeEnvironment(await parseEnvironment(content), this.db);
            break;
          }
          case 'players': {
            // Players from FTP only update the registry if the player ID appears in farm_players.
            // For now we parse but don't write a separate players table entry — farms.xml owns it.
            await parsePlayers(content);
            break;
          }
          case 'invoices': {
            writeInvoices(await parseInvoices(content), this.db);
            break;
          }
          case 'sales': {
            writeSales(await parseSales(content), this.db);
            break;
          }
        }
        processed++;
      } catch (err) {
        console.error(`[poller/ftp] Failed to process ${key}:`, (err as Error).message);
      }
    }

    updatePollerHealth('ftp', true, undefined, this.db);
    console.log(`[poller/ftp] OK — ${processed}/${results.length} files processed`);
  }
}
