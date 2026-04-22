import 'dotenv/config';
import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

const EXPECTED_FILES = [
  'farms.xml',
  'fields.xml',
  'environment.xml',
  'players.xml',
  'invoices.xml',
  'sales.xml',
  'precisionFarming.xml',
  'careerSavegame.xml',
  'vehicles.xml',
  'economy.xml',
  'farmland.xml',
  'items.xml',
];

async function main() {
  const configPath = path.resolve(__dirname, '..', '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const savegamePath: string = config.ftp.savegamePath;

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log(`[ftp-check] Connecting to ${process.env.FTP_HOST}:${process.env.FTP_PORT}`);

    await client.access({
      host: process.env.FTP_HOST,
      port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : 21,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true',
    });

    console.log('[ftp-check] Connected successfully');
    console.log(`[ftp-check] Listing: ${savegamePath}`);

    const list = await client.list(savegamePath);
    const found = list.map((f) => f.name);

    console.log(`\n[ftp-check] Files found (${found.length}):`);
    found.forEach((name) => console.log(`  ✓ ${name}`));

    const missing = EXPECTED_FILES.filter((name) => !found.includes(name));
    if (missing.length > 0) {
      console.log(`\n[ftp-check] Missing expected files (${missing.length}):`);
      missing.forEach((name) => console.log(`  ✗ ${name}`));
    } else {
      console.log('\n[ftp-check] All expected files present.');
    }

    const protocol = process.env.FTP_SECURE === 'true' ? 'FTPS' : 'plain FTP';
    console.log(`\n[ftp-check] Protocol: ${protocol}`);
  } catch (err) {
    console.error('[ftp-check] Connection failed:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
