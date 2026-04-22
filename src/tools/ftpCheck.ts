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

async function listDir(client: ftp.Client, dirPath: string, indent = ''): Promise<void> {
  const entries = await client.list(dirPath);
  for (const entry of entries) {
    const marker = entry.isDirectory ? '/' : '';
    console.log(`${indent}  ${entry.name}${marker}`);
    if (entry.isDirectory && indent === '') {
      await listDir(client, `${dirPath}/${entry.name}`, '  ');
    }
  }
}

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

    const protocol = process.env.FTP_SECURE === 'true' ? 'FTPS' : 'plain FTP';
    console.log(`[ftp-check] Connected (${protocol})`);
    console.log(`[ftp-check] Configured path: ${savegamePath}`);

    let list: ftp.FileInfo[];
    try {
      list = await client.list(savegamePath);
    } catch {
      console.error(`\n[ftp-check] Path not found: ${savegamePath}`);
      console.log('\n[ftp-check] Exploring server root to help find the correct path:\n');
      await listDir(client, '/');
      console.log(
        `\n[ftp-check] Update "ftp.savegamePath" in config.json to the correct directory and re-run.`,
      );
      process.exit(1);
    }

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
  } catch (err) {
    console.error('[ftp-check] Connection failed:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
