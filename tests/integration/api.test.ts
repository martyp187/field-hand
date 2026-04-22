import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTestDb } from '../helpers/testDb';
import { createApiRouter } from '../../src/api/router';
import { parseFarms } from '../../src/parser/farmsParser';
import { parseFields } from '../../src/parser/fieldsParser';
import { parseVehicles } from '../../src/parser/vehiclesParser';
import { parseEnvironment } from '../../src/parser/environmentParser';
import { parseEconomy } from '../../src/parser/economyParser';
import { parseInvoices } from '../../src/parser/invoicesParser';
import { parseSales } from '../../src/parser/salesParser';
import { parseStats } from '../../src/parser/statsParser';
import { writeFarms } from '../../src/db/writers/farmsWriter';
import { writeFields } from '../../src/db/writers/fieldsWriter';
import { writeVehicles } from '../../src/db/writers/vehiclesWriter';
import { writeEnvironment } from '../../src/db/writers/environmentWriter';
import { writeEconomy } from '../../src/db/writers/economyWriter';
import { writeInvoices } from '../../src/db/writers/invoicesWriter';
import { writeSales } from '../../src/db/writers/salesWriter';
import { writeServerSnapshot, writeFarmlands } from '../../src/db/writers/serverWriter';

const fixture = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', name), 'utf-8');

const IGNORED_IDS = [2];

async function buildApp() {
  const db = createTestDb();

  // Seed test data from fixtures
  const [farms, fields, vehicles, env, economy, invoices, sales, stats] = await Promise.all([
    parseFarms(fixture('farms.xml'), IGNORED_IDS),
    parseFields(fixture('fields.xml')),
    parseVehicles(fixture('vehicles.html')),
    parseEnvironment(fixture('environment.xml')),
    parseEconomy(fixture('economy.html')),
    parseInvoices(fixture('invoices.xml')),
    parseSales(fixture('sales.xml')),
    parseStats(fixture('stats.html')),
  ]);

  writeFarms(farms, db);
  writeFields(fields, db);
  writeVehicles(vehicles, db);
  writeEnvironment(env, db);
  writeEconomy(economy, db);
  writeInvoices(invoices, db);
  writeSales(sales, db);
  writeServerSnapshot(stats, db);
  writeFarmlands(stats.farmlands, db);

  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter(db));

  return { app, db };
}

describe('5.3 — GET /api/server/status', () => {
  it('returns snapshot and pollerHealth', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/server/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('snapshot');
    expect(res.body).toHaveProperty('pollerHealth');
  });
});

describe('5.4 — GET /api/server/weather', () => {
  it('returns environment data with parsed weatherForecast', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/server/weather');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('current_day');
    expect(res.body).toHaveProperty('weatherForecast');
    expect(res.body).not.toHaveProperty('weather_forecast_json');
  });
});

describe('5.5 — GET /api/farms', () => {
  it('returns all farms with player_count', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('player_count');
    expect(res.body.find((f: { farm_id: number }) => f.farm_id === 2)).toBeUndefined();
  });
});

describe('5.6 — GET /api/farms/:id', () => {
  it('returns farm with players array', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('farm_id', 1);
    expect(Array.isArray(res.body.players)).toBe(true);
  });

  it('returns 404 for unknown farm', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms/999');
    expect(res.status).toBe(404);
  });
});

describe('5.7 — GET /api/farms/:id/finances', () => {
  it('returns finance snapshots for farm', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms/1/finances');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('5.8 — GET /api/farms/:id/statistics', () => {
  it('returns statistics snapshots for farm', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms/1/statistics');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('5.9 — GET /api/farms/:id/fields', () => {
  it('returns farmlands owned by the farm', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms/1/fields');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('5.10 — GET /api/farms/:id/vehicles', () => {
  it('returns vehicles for farm with parsed fills', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farms/1/vehicles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).not.toHaveProperty('fills_json');
    }
  });
});

describe('5.13 — GET /api/fields', () => {
  it('returns all field plots', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/fields');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('5.14 — GET /api/farmlands', () => {
  it('returns all farmlands with owner info', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/farmlands');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('5.15 — GET /api/economy/prices', () => {
  it('returns prices grouped by fill type', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/economy/prices');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });
});

describe('5.16 — GET /api/market/vehicles', () => {
  it('returns sales market vehicles', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/market/vehicles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('5.17 — GET /api/tasks', () => {
  it('returns empty array when no tasks', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by status', async () => {
    const { app, db } = await buildApp();
    db.prepare(
      `INSERT INTO tasks (farm_id, title, status, priority, created_at) VALUES (1, 'Test task', 'OPEN', 'MEDIUM', ?)`,
    ).run(new Date().toISOString());

    const res = await request(app).get('/api/tasks?status=OPEN');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe('5.18 — POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const { app } = await buildApp();
    const res = await request(app).post('/api/tasks').send({
      farmId: 1,
      title: 'Harvest wheat in field 3',
      priority: 'HIGH',
      category: 'Harvest',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Harvest wheat in field 3');
    expect(res.body.status).toBe('OPEN');
    expect(res.body.priority).toBe('HIGH');
  });

  it('returns 400 when title is missing', async () => {
    const { app } = await buildApp();
    const res = await request(app).post('/api/tasks').send({ farmId: 1 });
    expect(res.status).toBe(400);
  });
});

describe('5.19 — PATCH /api/tasks/:id/claim', () => {
  it('claims a task and transitions it to IN_PROGRESS', async () => {
    const { app, db } = await buildApp();
    const result = db
      .prepare(
        `INSERT INTO tasks (title, status, priority, created_at) VALUES ('Task to claim', 'OPEN', 'MEDIUM', ?)`,
      )
      .run(new Date().toISOString());
    const taskId = result.lastInsertRowid;

    const res = await request(app)
      .patch(`/api/tasks/${taskId}/claim`)
      .send({ playerNickname: 'marty' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('returns 409 when task already claimed', async () => {
    const { app, db } = await buildApp();
    const result = db
      .prepare(
        `INSERT INTO tasks (title, status, priority, created_at) VALUES ('Already claimed', 'IN_PROGRESS', 'MEDIUM', ?)`,
      )
      .run(new Date().toISOString());
    const taskId = result.lastInsertRowid;
    db.prepare(
      `INSERT INTO task_claims (task_id, player_nickname, claimed_at) VALUES (?, 'alice', ?)`,
    ).run(taskId, new Date().toISOString());

    const res = await request(app)
      .patch(`/api/tasks/${taskId}/claim`)
      .send({ playerNickname: 'bob' });
    expect(res.status).toBe(409);
  });
});

describe('5.20 — PATCH /api/tasks/:id/status', () => {
  it('marks a task as DONE', async () => {
    const { app, db } = await buildApp();
    const result = db
      .prepare(
        `INSERT INTO tasks (title, status, priority, created_at) VALUES ('Finish me', 'IN_PROGRESS', 'MEDIUM', ?)`,
      )
      .run(new Date().toISOString());
    const taskId = result.lastInsertRowid;

    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .send({ status: 'DONE' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DONE');
    expect(res.body.completed_at).toBeTruthy();
  });

  it('returns 400 for invalid status', async () => {
    const { app, db } = await buildApp();
    const result = db
      .prepare(
        `INSERT INTO tasks (title, status, priority, created_at) VALUES ('Bad status', 'OPEN', 'MEDIUM', ?)`,
      )
      .run(new Date().toISOString());

    const res = await request(app)
      .patch(`/api/tasks/${result.lastInsertRowid}/status`)
      .send({ status: 'NONSENSE' });
    expect(res.status).toBe(400);
  });
});

describe('5.21 — GET /api/goals', () => {
  it('returns empty array when no goals', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('5.22 — GET /api/poller/health', () => {
  it('returns pollerHealth and unresolvedAlerts', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/poller/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pollerHealth');
    expect(res.body).toHaveProperty('unresolvedAlerts');
  });
});
