import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { downloadSingleFile } from '../poller/ftpDownloader';
import { parseFarms } from '../parser/farmsParser';
import { parseFields } from '../parser/fieldsParser';
import { parseEnvironment } from '../parser/environmentParser';
import { parsePlayers } from '../parser/playersParser';
import { parseInvoices } from '../parser/invoicesParser';
import { parseSales } from '../parser/salesParser';

const FIXTURE_DIR = path.resolve(__dirname, '..', '..', 'tests', 'fixtures');
const IGNORED_FARM_IDS: number[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'config.json'), 'utf-8'),
).ignoredFarmIds ?? [2];

const saveFixtures = process.argv.includes('--save') || process.argv.includes('-s');

function hr(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
}

function saveFixture(name: string, content: string): void {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  fs.writeFileSync(path.join(FIXTURE_DIR, name), content, 'utf-8');
}

async function checkFarms(): Promise<void> {
  hr('farms.xml');
  try {
    const xml = await downloadSingleFile('farms');
    if (saveFixtures) saveFixture('farms.xml', xml);
    const feed = await parseFarms(xml, IGNORED_FARM_IDS);
    console.log(`Farms: ${feed.farms.length} (after filtering ignored IDs: ${IGNORED_FARM_IDS})`);
    for (const farm of feed.farms) {
      console.log(`\n  Farm ${farm.farmId}: "${farm.name}" [colour #${farm.colorIndex} → ${farm.colorHex}]`);
      console.log(`    Balance: $${farm.money.toFixed(2)}  Loan: $${farm.loan.toFixed(2)}`);
      console.log(`    Players: ${farm.players.length}`);
      farm.players.forEach((p) =>
        console.log(`      ${p.lastNickname}${p.farmManager ? ' [manager]' : ''} — ${p.timeLastConnected}`),
      );
      console.log(`    Worked: ${farm.statistics.workedHectares.toFixed(1)} ha  Fuel: ${farm.statistics.fuelUsage.toFixed(1)} L`);
      console.log(`    Finance days recorded: ${farm.finances.length}`);
    }
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkFields(): Promise<void> {
  hr('fields.xml');
  try {
    const xml = await downloadSingleFile('fields');
    if (saveFixtures) saveFixture('fields.xml', xml);
    const feed = await parseFields(xml);
    console.log(`Fields: ${feed.fields.length} total`);

    const byGround: Record<string, number> = {};
    const harvestReady: number[] = [];
    feed.fields.forEach((f) => {
      byGround[f.groundType] = (byGround[f.groundType] ?? 0) + 1;
      if (f.groundType.startsWith('HARVEST_READY')) harvestReady.push(f.id);
    });

    console.log('\nBy ground type:');
    Object.entries(byGround).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    if (harvestReady.length)
      console.log(`\nHarvest ready fields: ${harvestReady.join(', ')}`);
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkEnvironment(): Promise<void> {
  hr('environment.xml');
  try {
    const xml = await downloadSingleFile('environment');
    if (saveFixtures) saveFixture('environment.xml', xml);
    const feed = await parseEnvironment(xml);
    console.log(`Day:           ${feed.currentDay} (monotonic: ${feed.currentMonotonicDay})`);
    console.log(`Season:        ${feed.currentSeason}`);
    console.log(`Day time:      ${feed.dayTime.toFixed(0)}s`);
    console.log(`Since rain:    ${feed.timeSinceLastRain}s`);
    console.log(`Forecast:      ${feed.forecast.length} entries`);
    const next5 = feed.forecast.slice(0, 5);
    next5.forEach((w) =>
      console.log(`  Day ${w.startDay}: ${w.typeName} (${w.season})`),
    );
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkPlayers(): Promise<void> {
  hr('players.xml');
  try {
    const xml = await downloadSingleFile('players');
    if (saveFixtures) saveFixture('players.xml', xml);
    const feed = await parsePlayers(xml);
    console.log(`Players in registry: ${feed.players.length}`);
    feed.players.forEach((p) =>
      console.log(`  ${p.uniqueUserId.slice(0, 12)}… — last connected: ${p.timeLastConnected}`),
    );
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkInvoices(): Promise<void> {
  hr('invoices.xml');
  try {
    const xml = await downloadSingleFile('invoices');
    if (saveFixtures) saveFixture('invoices.xml', xml);
    const feed = await parseInvoices(xml);
    console.log(`Invoices: ${feed.invoices.length}`);
    feed.invoices.forEach((inv) =>
      console.log(
        `  #${inv.id}: Farm ${inv.senderFarmId} → Farm ${inv.recipientFarmId}  state=${inv.state}  items=${inv.lineItems.length}  total=$${inv.lineItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}`,
      ),
    );
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkSales(): Promise<void> {
  hr('sales.xml');
  try {
    const xml = await downloadSingleFile('sales');
    if (saveFixtures) saveFixture('sales.xml', xml);
    const feed = await parseSales(xml);
    console.log(`Used vehicles for sale: ${feed.items.length}`);
    feed.items.forEach((item) => {
      const name = item.xmlFilename.split('/').pop()?.replace('.xml', '') ?? item.xmlFilename;
      console.log(
        `  ${name}  $${item.price.toLocaleString()}  dmg=${(item.damage * 100).toFixed(0)}%  wear=${(item.wear * 100).toFixed(0)}%  ${item.timeLeft}d left`,
      );
    });
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function main() {
  console.log('FS25 FTP Data Check');
  if (saveFixtures) console.log('Mode: download + save fixtures to tests/fixtures/');

  await checkFarms();
  await checkFields();
  await checkEnvironment();
  await checkPlayers();
  await checkInvoices();
  await checkSales();

  console.log('\n' + '─'.repeat(60));
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
