import 'dotenv/config';
import * as ftp from 'basic-ftp';
import { Writable } from 'stream';
import fs from 'fs';
import path from 'path';

interface FtpConfig {
  savegamePath: string;
  files: Record<string, string>;
  fallbackPollIntervalSeconds: number;
}

function loadFtpConfig(): FtpConfig {
  const configPath = path.resolve(__dirname, '..', '..', 'config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')).ftp;
}

function buildFtpAccess() {
  return {
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : 21,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: process.env.FTP_SECURE === 'true',
  };
}

// Strip UTF-8 BOM if present
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

async function downloadToBuffer(client: ftp.Client, remotePath: string): Promise<string> {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  await client.downloadTo(writable, remotePath);
  return stripBom(Buffer.concat(chunks).toString('utf-8'));
}

export interface FtpFileResult {
  key: string;
  remotePath: string;
  content: string;
  modifiedAt: Date | null;
}

export interface FtpDownloadOptions {
  // If provided, skip downloading files whose modifiedAt hasn't changed since lastKnownMod
  lastKnownMods?: Record<string, Date>;
}

export async function downloadFtpFiles(
  fileKeys: string[],
  options: FtpDownloadOptions = {},
): Promise<FtpFileResult[]> {
  const config = loadFtpConfig();
  const client = new ftp.Client();
  client.ftp.verbose = false;

  const results: FtpFileResult[] = [];

  try {
    await client.access(buildFtpAccess());

    for (const key of fileKeys) {
      const filename = config.files[key];
      if (!filename) {
        console.warn(`[ftp] Unknown file key: ${key}`);
        continue;
      }
      const remotePath = `${config.savegamePath}/${filename}`;

      try {
        // Check modification time before downloading
        const listing = await client.list(config.savegamePath);
        const fileEntry = listing.find((f) => f.name === filename);
        const modifiedAt = fileEntry?.modifiedAt ?? null;

        // Skip if file hasn't changed since last known mod time
        if (modifiedAt && options.lastKnownMods?.[key]) {
          const lastKnown = options.lastKnownMods[key];
          if (modifiedAt <= lastKnown) {
            continue; // unchanged — caller keeps last good value
          }
        }

        const content = await downloadToBuffer(client, remotePath);
        results.push({ key, remotePath, content, modifiedAt });
      } catch (err) {
        console.error(`[ftp] Failed to download ${remotePath}:`, (err as Error).message);
      }
    }
  } finally {
    client.close();
  }

  return results;
}

export async function downloadSingleFile(fileKey: string): Promise<string> {
  const config = loadFtpConfig();
  const filename = config.files[fileKey];
  if (!filename) throw new Error(`Unknown FTP file key: ${fileKey}`);

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access(buildFtpAccess());
    const remotePath = `${config.savegamePath}/${filename}`;
    return await downloadToBuffer(client, remotePath);
  } finally {
    client.close();
  }
}
