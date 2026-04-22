import 'dotenv/config';
import fs from 'fs';
import path from 'path';

export type EndpointKey = 'stats' | 'careerSavegame' | 'vehicles' | 'economy';

interface HttpConfig {
  endpoints: Record<EndpointKey, string>;
}

function loadHttpConfig(): HttpConfig {
  const configPath = path.resolve(__dirname, '..', '..', 'config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')).http;
}

export function buildUrl(endpointKey: EndpointKey): string {
  const config = loadHttpConfig();
  const base = process.env.FS25_HTTP_BASE_URL;
  const port = process.env.FS25_HTTP_PORT;
  const code = process.env.FS25_STATS_CODE;

  if (!base || !port || !code) {
    throw new Error('Missing required env vars: FS25_HTTP_BASE_URL, FS25_HTTP_PORT, FS25_STATS_CODE');
  }

  const endpoint = config.endpoints[endpointKey];
  // Endpoint may already contain query params (e.g. ?file=vehicles), so append code with &
  const separator = endpoint.includes('?') ? '&' : '?';
  return `http://${base}:${port}${endpoint}${separator}code=${code}`;
}

export async function fetchEndpoint(endpointKey: EndpointKey): Promise<string> {
  const url = buildUrl(endpointKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new Error(`Empty response from ${url}`);
  }

  return text;
}
