import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fetchEndpoint } from '../poller/httpFetcher';
import { parseStats } from '../parser/statsParser';
import { parseVehicles } from '../parser/vehiclesParser';
import { parseEconomy } from '../parser/economyParser';
import { parseSavegame } from '../parser/savegameParser';

const FIXTURE_DIR = path.resolve(__dirname, '..', '..', 'tests', 'fixtures');

function saveFixture(name: string, content: string): void {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  fs.writeFileSync(path.join(FIXTURE_DIR, name), content, 'utf-8');
}

function hr(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
}

async function checkStats(saveFixtures: boolean): Promise<void> {
  hr('dedicated-server-stats');
  try {
    const xml = await fetchEndpoint('stats');
    if (saveFixtures) saveFixture('stats.html', xml);

    const stats = await parseStats(xml);
    console.log(`Server:    ${stats.serverName}`);
    console.log(`Map:       ${stats.mapName}`);
    console.log(`Version:   ${stats.gameVersion}`);
    console.log(`In-game:   ${stats.dayTimeFormatted} (${stats.dayTimeMs}ms)`);
    console.log(`Slots:     ${stats.slots.numUsed}/${stats.slots.capacity} used`);

    const online = stats.slots.players.filter((p) => p.isUsed);
    if (online.length) {
      console.log('\nPlayers online:');
      online.forEach((p) =>
        console.log(`  ${p.name}${p.isAdmin ? ' [admin]' : ''} — ping ${p.ping}ms`),
      );
    } else {
      console.log('Players online: none');
    }

    console.log(`\nFarmlands: ${stats.farmlands.length} total`);
    const owned = stats.farmlands.filter((f) => f.isOwned);
    console.log(`           ${owned.length} owned`);

    console.log(`\nVehicles:  ${stats.vehicles.length} visible in stats feed`);

    console.log(`\nMods:      ${stats.mods.length} loaded`);
    if (saveFixtures) console.log('  [fixture saved: tests/fixtures/stats.html]');
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkVehicles(saveFixtures: boolean): Promise<void> {
  hr('dedicated-server-savegame?file=vehicles');
  try {
    const xml = await fetchEndpoint('vehicles');
    if (saveFixtures) saveFixture('vehicles.html', xml);

    const feed = await parseVehicles(xml);
    console.log(`Vehicles: ${feed.vehicles.length} total`);

    const byFarm: Record<number, number> = {};
    const byState: Record<string, number> = {};
    feed.vehicles.forEach((v) => {
      byFarm[v.farmId] = (byFarm[v.farmId] ?? 0) + 1;
      byState[v.propertyState] = (byState[v.propertyState] ?? 0) + 1;
    });

    console.log('\nBy farm ID:');
    Object.entries(byFarm).forEach(([id, count]) => console.log(`  Farm ${id}: ${count}`));
    console.log('\nBy property state:');
    Object.entries(byState).forEach(([state, count]) => console.log(`  ${state}: ${count}`));

    if (saveFixtures) console.log('\n[fixture saved: tests/fixtures/vehicles.html]');
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkEconomy(saveFixtures: boolean): Promise<void> {
  hr('dedicated-server-savegame?file=economy');
  try {
    const xml = await fetchEndpoint('economy');
    if (saveFixtures) saveFixture('economy.html', xml);

    const feed = await parseEconomy(xml);
    console.log(`Crop types: ${feed.crops.length}`);
    if (feed.crops.length > 0) {
      console.log('\nSample (first 3 crops):');
      feed.crops.slice(0, 3).forEach((c) => {
        const priceRange =
          c.prices.length > 0
            ? `$${Math.min(...c.prices.map((p) => p.price))}–$${Math.max(...c.prices.map((p) => p.price))}`
            : 'no prices';
        console.log(`  ${c.fillType}: ${priceRange} across ${c.prices.length} periods`);
      });
    }

    if (saveFixtures) console.log('\n[fixture saved: tests/fixtures/economy.html]');
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function checkSavegame(saveFixtures: boolean): Promise<void> {
  hr('dedicated-server-savegame?file=careerSavegame');
  try {
    const xml = await fetchEndpoint('careerSavegame');
    if (saveFixtures) saveFixture('savegame.html', xml);

    const settings = await parseSavegame(xml);
    console.log(`autoSaveInterval: ${settings.autoSaveInterval}s`);
    console.log(`timeScale:        ${settings.timeScale}×`);
    console.log(`economicDiff:     ${settings.economicDifficulty}`);
    console.log(`growthMode:       ${settings.growthMode}`);
    if (settings.mapTitle) console.log(`map:              ${settings.mapTitle}`);
    if (settings.savegameName) console.log(`savegame:         ${settings.savegameName}`);

    if (saveFixtures) console.log('\n[fixture saved: tests/fixtures/savegame.html]');
  } catch (err) {
    console.error('  FAILED:', (err as Error).message);
  }
}

async function main() {
  const saveFixtures = process.argv.includes('--save') || process.argv.includes('-s');
  console.log('FS25 HTTP Check');
  console.log(`Target: http://${process.env.FS25_HTTP_BASE_URL}:${process.env.FS25_HTTP_PORT}`);
  if (saveFixtures) console.log('Mode: fetch + save fixtures to tests/fixtures/');

  await checkStats(saveFixtures);
  await checkVehicles(saveFixtures);
  await checkEconomy(saveFixtures);
  await checkSavegame(saveFixtures);

  console.log('\n' + '─'.repeat(60));
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
