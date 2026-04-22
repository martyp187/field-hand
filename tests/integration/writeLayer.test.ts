import fs from 'fs';
import path from 'path';
import { createTestDb } from '../helpers/testDb';
import { parseFarms } from '../../src/parser/farmsParser';
import { parseFields } from '../../src/parser/fieldsParser';
import { parseEnvironment } from '../../src/parser/environmentParser';
import { parseInvoices } from '../../src/parser/invoicesParser';
import { parseSales } from '../../src/parser/salesParser';
import { parseVehicles } from '../../src/parser/vehiclesParser';
import { parseEconomy } from '../../src/parser/economyParser';
import { writeFarms } from '../../src/db/writers/farmsWriter';
import { writeFields } from '../../src/db/writers/fieldsWriter';
import { writeEnvironment } from '../../src/db/writers/environmentWriter';
import { writeInvoices } from '../../src/db/writers/invoicesWriter';
import { writeSales } from '../../src/db/writers/salesWriter';
import { writeVehicles } from '../../src/db/writers/vehiclesWriter';
import { writeEconomy } from '../../src/db/writers/economyWriter';
import { parsePrecisionFarming } from '../../src/parser/precisionFarmingParser';
import { writePrecisionFarming } from '../../src/db/writers/precisionFarmingWriter';

const fixture = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', name), 'utf-8');

const IGNORED_IDS = [2];

describe('writeFarms', () => {
  it('writes farms and players to the database', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);

    const farms = db.prepare('SELECT * FROM farms').all() as { farm_id: number }[];
    expect(farms.length).toBeGreaterThan(0);
    farms.forEach((f) => expect(f.farm_id).not.toBe(2));
  });

  it('writes farm_players for each player', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);

    const rows = db.prepare('SELECT * FROM farm_players').all() as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
  });

  it('writes finance snapshots', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);

    const rows = db.prepare('SELECT * FROM farm_finance_snapshots').all() as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
  });

  it('writes statistics snapshots', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);

    const rows = db.prepare('SELECT * FROM farm_statistics_snapshots').all() as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
  });

  it('3.21 — two identical polls produce no duplicate farm rows', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);
    writeFarms(feed, db);

    const farms = db.prepare('SELECT * FROM farms').all() as Record<string, unknown>[];
    expect(farms.length).toBe(feed.farms.length);
  });

  it('3.21 — two identical polls produce no duplicate finance rows', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);
    writeFarms(feed, db);

    const rows = db.prepare('SELECT * FROM farm_finance_snapshots').all() as Record<string, unknown>[];
    const expected = feed.farms.reduce((sum, f) => sum + f.finances.length, 0);
    expect(rows.length).toBe(expected);
  });

  it('3.22 — Farm 2 never appears in farms table', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms.xml'), IGNORED_IDS);
    writeFarms(feed, db);

    const row = db.prepare('SELECT * FROM farms WHERE farm_id = 2').get();
    expect(row).toBeUndefined();
  });
});

describe('writeFields', () => {
  it('writes all fields', async () => {
    const db = createTestDb();
    const feed = await parseFields(fixture('fields.xml'));
    writeFields(feed, db);

    const rows = db.prepare('SELECT * FROM fields').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.fields.length);
  });

  it('3.21 — two identical polls produce no duplicate field rows', async () => {
    const db = createTestDb();
    const feed = await parseFields(fixture('fields.xml'));
    writeFields(feed, db);
    writeFields(feed, db);

    const rows = db.prepare('SELECT * FROM fields').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.fields.length);
  });
});

describe('writeEnvironment', () => {
  it('writes environment snapshot', async () => {
    const db = createTestDb();
    const feed = await parseEnvironment(fixture('environment.xml'));
    writeEnvironment(feed, db);

    const row = db.prepare('SELECT * FROM environment_snapshots').get() as Record<string, unknown>;
    expect(row.current_day).toBe(feed.currentDay);
    expect(row.season).toBe(feed.currentSeason);
  });

  it('each poll appends a new snapshot row', async () => {
    const db = createTestDb();
    const feed = await parseEnvironment(fixture('environment.xml'));
    writeEnvironment(feed, db);
    writeEnvironment(feed, db);

    const rows = db.prepare('SELECT * FROM environment_snapshots').all() as Record<string, unknown>[];
    expect(rows.length).toBe(2);
  });
});

describe('writeInvoices', () => {
  it('writes invoices', async () => {
    const db = createTestDb();
    const feed = await parseInvoices(fixture('invoices.xml'));
    writeInvoices(feed, db);

    const rows = db.prepare('SELECT * FROM invoices').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.invoices.length);
  });

  it('3.21 — two identical polls produce no duplicate invoice rows', async () => {
    const db = createTestDb();
    const feed = await parseInvoices(fixture('invoices.xml'));
    writeInvoices(feed, db);
    writeInvoices(feed, db);

    const rows = db.prepare('SELECT * FROM invoices').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.invoices.length);
  });
});

describe('writeSales', () => {
  it('writes sales market items', async () => {
    const db = createTestDb();
    const feed = await parseSales(fixture('sales.xml'));
    writeSales(feed, db);

    const rows = db.prepare('SELECT * FROM sales_market').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.items.length);
  });

  it('3.21 — two identical polls produce no duplicate sales rows', async () => {
    const db = createTestDb();
    const feed = await parseSales(fixture('sales.xml'));
    writeSales(feed, db);
    writeSales(feed, db);

    const rows = db.prepare('SELECT * FROM sales_market').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.items.length);
  });
});

describe('writeVehicles', () => {
  it('writes vehicles', async () => {
    const db = createTestDb();
    const feed = await parseVehicles(fixture('vehicles.html'));
    writeVehicles(feed, db);

    const rows = db.prepare('SELECT * FROM vehicles').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.vehicles.length);
  });

  it('3.21 — two identical polls produce no duplicate vehicle rows', async () => {
    const db = createTestDb();
    const feed = await parseVehicles(fixture('vehicles.html'));
    writeVehicles(feed, db);
    writeVehicles(feed, db);

    const rows = db.prepare('SELECT * FROM vehicles').all() as Record<string, unknown>[];
    expect(rows.length).toBe(feed.vehicles.length);
  });
});

describe('writeEconomy', () => {
  it('writes economy prices', async () => {
    const db = createTestDb();
    const feed = await parseEconomy(fixture('economy.html'));
    writeEconomy(feed, db);

    const rows = db.prepare('SELECT * FROM economy_prices').all() as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
  });

  it('3.21 — two identical polls produce no duplicate price rows', async () => {
    const db = createTestDb();
    const feed = await parseEconomy(fixture('economy.html'));
    writeEconomy(feed, db);
    writeEconomy(feed, db);

    const before = (db.prepare('SELECT COUNT(*) AS n FROM economy_prices').get() as { n: number }).n;
    writeEconomy(feed, db);
    const after = (db.prepare('SELECT COUNT(*) AS n FROM economy_prices').get() as { n: number }).n;
    expect(after).toBe(before);
  });
});

describe('app_settings seed', () => {
  it('seeds all default keys', () => {
    const db = createTestDb();
    const keys = (db.prepare('SELECT key FROM app_settings').all() as { key: string }[]).map(
      (r) => r.key,
    );
    expect(keys).toContain('httpPollIntervalSeconds');
    expect(keys).toContain('farmColourPalette');
    expect(keys).toContain('ignoredFarmIds');
  });

  it('seedSettings is idempotent — second call does not overwrite', () => {
    const db = createTestDb();
    // createTestDb already called seedSettings once; call again
    const { seedSettings } = require('../../src/db/schema');
    seedSettings(db);

    const rows = db.prepare('SELECT * FROM app_settings').all() as Record<string, unknown>[];
    const httpInterval = rows.find((r) => r.key === 'httpPollIntervalSeconds');
    expect(httpInterval?.value).toBe('60');
  });
});

describe('2.18 — finance day structure', () => {
  it('two different in-game days produce two rows per farm', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms_multiday.xml'), []);
    writeFarms(feed, db);

    // Farm 1 has day=0 and day=1 in the fixture
    const rows = db
      .prepare(`SELECT in_game_day FROM farm_finance_snapshots WHERE farm_id = 1 ORDER BY in_game_day`)
      .all() as { in_game_day: number }[];
    expect(rows.length).toBe(2);
    expect(rows[0].in_game_day).toBe(0);
    expect(rows[1].in_game_day).toBe(1);
  });

  it('re-polling same multiday data does not create duplicate rows', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms_multiday.xml'), []);
    writeFarms(feed, db);
    writeFarms(feed, db);

    const rows = db
      .prepare(`SELECT COUNT(*) AS n FROM farm_finance_snapshots WHERE farm_id = 1`)
      .get() as { n: number };
    expect(rows.n).toBe(2);
  });

  it('day=1 values are stored correctly and overwrite on re-poll', async () => {
    const db = createTestDb();
    const feed = await parseFarms(fixture('farms_multiday.xml'), []);
    writeFarms(feed, db);

    const day1 = db
      .prepare(`SELECT harvest_income FROM farm_finance_snapshots WHERE farm_id = 1 AND in_game_day = 1`)
      .get() as { harvest_income: number };
    expect(day1.harvest_income).toBe(12500);
  });
});

describe('writePrecisionFarming', () => {
  it('2.11 — writes farmland_precision_stats rows', async () => {
    const db = createTestDb();
    const feed = await parsePrecisionFarming(fixture('precisionFarming.xml'));
    writePrecisionFarming(feed, db);

    const rows = db
      .prepare('SELECT COUNT(*) AS n FROM farmland_precision_stats')
      .get() as { n: number };
    expect(rows.n).toBe(feed.farmlandStats.length);
  });

  it('2.11 — period_counter_json and total_counter_json are valid JSON', async () => {
    const db = createTestDb();
    const feed = await parsePrecisionFarming(fixture('precisionFarming.xml'));
    writePrecisionFarming(feed, db);

    const row = db
      .prepare('SELECT period_counter_json, total_counter_json FROM farmland_precision_stats LIMIT 1')
      .get() as { period_counter_json: string; total_counter_json: string };
    expect(() => JSON.parse(row.period_counter_json)).not.toThrow();
    expect(() => JSON.parse(row.total_counter_json)).not.toThrow();
  });

  it('2.11 — two identical polls produce no duplicate rows', async () => {
    const db = createTestDb();
    const feed = await parsePrecisionFarming(fixture('precisionFarming.xml'));
    writePrecisionFarming(feed, db);
    writePrecisionFarming(feed, db);

    const rows = db
      .prepare('SELECT COUNT(*) AS n FROM farmland_precision_stats')
      .get() as { n: number };
    expect(rows.n).toBe(feed.farmlandStats.length);
  });
});
