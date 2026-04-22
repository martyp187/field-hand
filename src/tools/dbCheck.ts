import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import db from '../db/connection';
import { initSchema, seedSettings } from '../db/schema';
import { parseFarms } from '../parser/farmsParser';
import { parseFields } from '../parser/fieldsParser';
import { parseEnvironment } from '../parser/environmentParser';
import { parseInvoices } from '../parser/invoicesParser';
import { parseSales } from '../parser/salesParser';
import { parseVehicles } from '../parser/vehiclesParser';
import { parseEconomy } from '../parser/economyParser';
import { writeFarms } from '../db/writers/farmsWriter';
import { writeFields } from '../db/writers/fieldsWriter';
import { writeEnvironment } from '../db/writers/environmentWriter';
import { writeInvoices } from '../db/writers/invoicesWriter';
import { writeSales } from '../db/writers/salesWriter';
import { writeVehicles } from '../db/writers/vehiclesWriter';
import { writeEconomy } from '../db/writers/economyWriter';

const FIXTURE_DIR = path.resolve(__dirname, '..', '..', 'tests', 'fixtures');
const IGNORED_FARM_IDS: number[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'config.json'), 'utf-8'),
).ignoredFarmIds ?? [2];

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf-8');
}

function hr(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
}

function count(table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

async function main() {
  console.log('FS25 DB Write Check');
  console.log(`Fixtures: ${FIXTURE_DIR}`);

  hr('Init schema + seed settings');
  initSchema(db);
  seedSettings(db);
  console.log(`  app_settings rows: ${count('app_settings')}`);

  hr('Write farms');
  const farmsFeed = await parseFarms(fixture('farms.xml'), IGNORED_FARM_IDS);
  writeFarms(farmsFeed, db);
  console.log(`  farms:                    ${count('farms')}`);
  console.log(`  players:                  ${count('players')}`);
  console.log(`  farm_players:             ${count('farm_players')}`);
  console.log(`  farm_finance_snapshots:   ${count('farm_finance_snapshots')}`);
  console.log(`  farm_statistics_snapshots:${count('farm_statistics_snapshots')}`);

  hr('Write fields');
  const fieldsFeed = await parseFields(fixture('fields.xml'));
  writeFields(fieldsFeed, db);
  console.log(`  fields: ${count('fields')}`);

  hr('Write environment');
  const envFeed = await parseEnvironment(fixture('environment.xml'));
  writeEnvironment(envFeed, db);
  console.log(`  environment_snapshots: ${count('environment_snapshots')}`);

  hr('Write invoices');
  const invoicesFeed = await parseInvoices(fixture('invoices.xml'));
  writeInvoices(invoicesFeed, db);
  console.log(`  invoices: ${count('invoices')}`);

  hr('Write sales market');
  const salesFeed = await parseSales(fixture('sales.xml'));
  writeSales(salesFeed, db);
  console.log(`  sales_market: ${count('sales_market')}`);

  hr('Write vehicles');
  const vehiclesFeed = await parseVehicles(fixture('vehicles.html'));
  writeVehicles(vehiclesFeed, db);
  console.log(`  vehicles: ${count('vehicles')}`);

  hr('Write economy prices');
  const economyFeed = await parseEconomy(fixture('economy.html'));
  writeEconomy(economyFeed, db);
  console.log(`  economy_prices: ${count('economy_prices')}`);

  hr('Diff detection check — repeat all writes');
  writeFarms(farmsFeed, db);
  writeFields(fieldsFeed, db);
  writeInvoices(invoicesFeed, db);
  writeSales(salesFeed, db);
  writeVehicles(vehiclesFeed, db);
  writeEconomy(economyFeed, db);
  console.log(`  farms:                    ${count('farms')} (expected: ${farmsFeed.farms.length})`);
  console.log(`  fields:                   ${count('fields')} (expected: ${fieldsFeed.fields.length})`);
  console.log(`  invoices:                 ${count('invoices')} (expected: ${invoicesFeed.invoices.length})`);
  console.log(`  sales_market:             ${count('sales_market')} (expected: ${salesFeed.items.length})`);
  console.log(`  vehicles:                 ${count('vehicles')} (expected: ${vehiclesFeed.vehicles.length})`);
  console.log(`  environment_snapshots:    ${count('environment_snapshots')} (should be 1 — upsert check)`);

  hr('Farm 2 filter check');
  const farm2Row = db.prepare('SELECT * FROM farms WHERE farm_id = 2').get();
  console.log(`  Farm 2 in farms table: ${farm2Row ? 'FAIL — row found' : 'PASS — not present'}`);

  hr('Query back sample data');
  const farms = db.prepare('SELECT farm_id, name, money, loan FROM farms').all() as {
    farm_id: number;
    name: string;
    money: number;
    loan: number;
  }[];
  farms.forEach((f) =>
    console.log(`  Farm ${f.farm_id}: "${f.name}"  $${f.money.toFixed(2)}  loan=$${f.loan.toFixed(2)}`),
  );

  const env = db.prepare('SELECT current_day, season FROM environment_snapshots ORDER BY id DESC LIMIT 1').get() as {
    current_day: number;
    season: string;
  };
  console.log(`\n  Latest environment: Day ${env.current_day}, ${env.season}`);

  console.log('\n' + '─'.repeat(60));
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
