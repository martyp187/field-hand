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
import { writePrecisionFarming } from '../db/writers/precisionFarmingWriter';
import { parsePrecisionFarming } from '../parser/precisionFarmingParser';
import { updatePollerHealth, checkStaleAndAlert } from './pollerHealth';
import { broadcast } from '../api/sseManager';
import {
  validateServerStats,
  validateFarms,
  validateFields,
  validateVehicles,
} from './validators';
import { generateTasksFromTrigger, generateTaskFromTemplateId } from '../tasks/templateEngine';
import { createAlert } from '../notifications/alertManager';
import type { VehicleFull } from '../types/vehicles';
import type { FarmlandEntry } from '../types/stats';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'config.json'), 'utf-8'),
);
const IGNORED_FARM_IDS: number[] = config.ignoredFarmIds ?? [2];
const FTP_KEYS = ['farms', 'fields', 'environment', 'players', 'invoices', 'sales', 'precisionFarming'];

const FUEL_FILL_TYPES = new Set(['DIESEL', 'DEF', 'METHANE', 'ELECTRICCHARGE']);

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
    // Check farmland ownership changes BEFORE writing the new state
    this.checkFarmlandChanges(stats.farmlands);
    writeFarmlands(stats.farmlands, this.db);
    writeVehicles(vehicles, this.db);
    writeEconomy(economy, this.db);

    // 6.7 — Auto-task trigger: fuel below threshold
    this.checkFuelLevels(vehicles.vehicles);
    // 11.3 — Task due date alerts
    this.checkTasksDue();

    updatePollerHealth('http', true, undefined, this.db);
    broadcast('server-update', {
      serverName: stats.serverName,
      playerCount: stats.slots.numUsed,
      slotsCapacity: stats.slots.capacity,
      dayTimeMs: stats.dayTimeMs,
      gameVersion: stats.gameVersion,
    });
    console.log(`[poller/http] OK — ${stats.slots.numUsed}/${stats.slots.capacity} players online`);
  }

  // 6.7 — Check each owned vehicle's fuel fill types against FUEL_LOW templates.
  // Each template's trigger_value JSON: { fuelType, thresholdLiters, cooldownMinutes }
  private checkFuelLevels(vehicles: VehicleFull[]): void {
    const templates = this.db
      .prepare(
        `SELECT id, trigger_value FROM recurring_task_templates WHERE trigger_type = 'FUEL_LOW'`,
      )
      .all() as Array<{ id: number; trigger_value: string | null }>;

    if (templates.length === 0) return;

    for (const v of vehicles) {
      if (v.propertyState !== 'OWNED') continue;

      for (const fill of v.fills) {
        if (!FUEL_FILL_TYPES.has(fill.type.toUpperCase()) || fill.level <= 0) continue;

        for (const tpl of templates) {
          let cfg: { fuelType?: string; thresholdLiters?: number } = {};
          try {
            cfg = tpl.trigger_value ? JSON.parse(tpl.trigger_value) : {};
          } catch {
            continue;
          }

          const fuelType = (cfg.fuelType ?? 'DIESEL').toUpperCase();
          if (fill.type.toUpperCase() !== fuelType) continue;
          if (fill.level >= (cfg.thresholdLiters ?? 50)) continue;

          const generated = generateTaskFromTemplateId(
            tpl.id,
            {
              vehicleName: v.name,
              vehicleId: v.uniqueId,
              fuelType: fill.type,
              fuelLevel: fill.level.toFixed(1),
            },
            this.db,
            true, // respect cooldown
          );

          // 11.6 — Fuel low alert (one per vehicle+fuelType per hour)
          if (generated) {
            const hourSlot = new Date().toISOString().substring(0, 13);
            createAlert(
              this.db,
              'fuel_low',
              `Low ${fill.type.toLowerCase()} in ${v.name ?? 'vehicle'}`,
              {
                body: `${fill.level.toFixed(0)} L remaining — refuel soon.`,
                data: { vehicleId: v.uniqueId, fuelType: fill.type, level: fill.level },
                dedup_key: `fuel_low:${v.uniqueId}:${fill.type}:${hourSlot}`,
              },
            );
          }
        }
      }
    }
  }

  // 11.3 — Check tasks with due dates approaching or overdue.
  private checkTasksDue(): void {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    const tasks = this.db
      .prepare(
        `SELECT id, title, due_date FROM tasks
         WHERE status IN ('OPEN', 'IN_PROGRESS')
           AND due_date IS NOT NULL
           AND due_date <= ?`,
      )
      .all(in24h) as Array<{ id: number; title: string; due_date: string }>;

    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      const isOverdue = dueDate < now;
      const todaySlot = now.toISOString().substring(0, 10);
      createAlert(
        this.db,
        isOverdue ? 'task_overdue' : 'task_due',
        isOverdue ? `Overdue: ${task.title}` : `Due soon: ${task.title}`,
        {
          body: isOverdue
            ? `Due date was ${task.due_date.substring(0, 10)}.`
            : `Due on ${task.due_date.substring(0, 10)}.`,
          data: { task_id: task.id },
          dedup_key: `task_due:${task.id}:${todaySlot}`,
        },
      );
    }
  }

  // 11.8 — Detect when a farmland changes ownership.
  private checkFarmlandChanges(incoming: FarmlandEntry[]): void {
    for (const fl of incoming) {
      if (fl.ownerFarmId === 0) continue;
      const prev = this.db
        .prepare(`SELECT owner_farm_id FROM farmlands WHERE farmland_id = ?`)
        .get(fl.id) as { owner_farm_id: number } | undefined;
      if (!prev || prev.owner_farm_id === fl.ownerFarmId) continue;

      const farmRow = this.db
        .prepare(`SELECT name FROM farms WHERE farm_id = ?`)
        .get(fl.ownerFarmId) as { name: string } | undefined;
      const farmName = farmRow?.name ?? `Farm ${fl.ownerFarmId}`;
      const parcelLabel = fl.name ?? `Parcel #${fl.id}`;
      createAlert(this.db, 'farmland_acquired', `${farmName} acquired ${parcelLabel}`, {
        body: `${fl.areaHa.toFixed(1)} ha — $${fl.price.toLocaleString()}`,
        farm_id: fl.ownerFarmId,
        dedup_key: `farmland_acquired:${fl.id}:${fl.ownerFarmId}`,
      });
    }
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
            const env = await parseEnvironment(content);
            // 6.8 — Detect season change before writing so we can compare
            const prev = this.db
              .prepare(`SELECT season FROM environment_snapshots ORDER BY id DESC LIMIT 1`)
              .get() as { season: string } | undefined;
            writeEnvironment(env, this.db);
            if (prev?.season && prev.season !== env.currentSeason) {
              const count = generateTasksFromTrigger(
                'SEASON_CHANGE',
                { oldSeason: prev.season, newSeason: env.currentSeason },
                this.db,
              );
              if (count > 0) {
                console.log(
                  `[poller/ftp] Season ${prev.season} → ${env.currentSeason}: generated ${count} task(s)`,
                );
              }
              // 11.7 — Season change alert
              const season = env.currentSeason.charAt(0).toUpperCase() + env.currentSeason.slice(1).toLowerCase();
              createAlert(this.db, 'season_change', `Season changed to ${season}`, {
                body: `The in-game season has changed from ${prev.season.toLowerCase()} to ${env.currentSeason.toLowerCase()}.`,
                dedup_key: `season_change:${env.currentSeason}:${env.currentDay ?? ''}`,
              });
            }
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
          case 'precisionFarming': {
            writePrecisionFarming(await parsePrecisionFarming(content), this.db);
            break;
          }
        }
        processed++;
      } catch (err) {
        console.error(`[poller/ftp] Failed to process ${key}:`, (err as Error).message);
      }
    }

    updatePollerHealth('ftp', true, undefined, this.db);
    broadcast('farm-update', { processedFiles: processed, totalFiles: results.length });
    console.log(`[poller/ftp] OK — ${processed}/${results.length} files processed`);
  }
}
