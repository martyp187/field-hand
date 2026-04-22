import 'dotenv/config';
import db from '../db/connection';
import { initSchema } from '../db/schema';

interface HealthRow {
  source_name: string;
  last_poll_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  status: string;
}

interface AlertRow {
  id: number;
  alert_time: string;
  source: string;
  validator_name: string;
  description: string;
  resolved: number;
}

function pad(s: string | null, len: number): string {
  const str = s ?? '—';
  return str.length > len ? str.slice(0, len - 1) + '…' : str.padEnd(len);
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function main() {
  initSchema(db);

  const health = db
    .prepare(`SELECT * FROM poller_health ORDER BY source_name`)
    .all() as HealthRow[];

  const alerts = db
    .prepare(
      `SELECT * FROM data_quality_alerts WHERE resolved = 0 ORDER BY alert_time DESC LIMIT 10`,
    )
    .all() as AlertRow[];

  console.log('\n' + '─'.repeat(80));
  console.log('  FS25 Farm Companion — Poller Status');
  console.log('─'.repeat(80));

  if (health.length === 0) {
    console.log('  No poller health records yet — has the poller run?');
  } else {
    console.log(
      `  ${'SOURCE'.padEnd(20)} ${'STATUS'.padEnd(10)} ${'LAST POLL'.padEnd(14)} ${'LAST SUCCESS'.padEnd(14)} ${'FAILURES'.padEnd(10)} LAST ERROR`,
    );
    console.log('  ' + '─'.repeat(76));
    for (const row of health) {
      const statusIcon = row.status === 'OK' ? '✓' : row.status === 'DEGRADED' ? '⚠' : '✗';
      console.log(
        `  ${statusIcon} ${pad(row.source_name, 18)} ${pad(row.status, 10)} ${pad(relativeTime(row.last_poll_at), 14)} ${pad(relativeTime(row.last_success_at), 14)} ${String(row.consecutive_failures).padEnd(10)} ${row.last_error ?? ''}`,
      );
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('  Unresolved Data Quality Alerts (latest 10)');
  console.log('─'.repeat(80));

  if (alerts.length === 0) {
    console.log('  No unresolved alerts.');
  } else {
    for (const a of alerts) {
      console.log(`  [${a.alert_time.slice(0, 19)}] ${a.source}/${a.validator_name}: ${a.description}`);
    }
  }

  console.log('─'.repeat(80) + '\n');
}

main();
