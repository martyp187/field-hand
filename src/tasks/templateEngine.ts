import type { Database } from 'better-sqlite3';
import { broadcast } from '../api/sseManager';

interface Template {
  id: number;
  farm_id: number | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  trigger_type: string | null;
  trigger_value: string | null;
  last_generated_at: string | null;
}

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    context[key] !== undefined ? String(context[key]) : `{{${key}}}`,
  );
}

function createTaskFromTemplate(
  tpl: Template,
  context: Record<string, unknown>,
  db: Database,
  now: string,
): number {
  const title = interpolate(tpl.title, context);
  const description = tpl.description ? interpolate(tpl.description, context) : null;

  const result = db
    .prepare(
      `INSERT INTO tasks (farm_id, title, description, category, priority, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'OPEN', ?)`,
    )
    .run(tpl.farm_id ?? null, title, description, tpl.category ?? null, tpl.priority, now);

  db.prepare(`UPDATE recurring_task_templates SET last_generated_at = ? WHERE id = ?`).run(
    now,
    tpl.id,
  );

  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(result.lastInsertRowid);
  broadcast('task-update', { action: 'created', task, source: 'auto' });
  return 1;
}

function isCooledDown(tpl: Template): boolean {
  if (!tpl.trigger_value || !tpl.last_generated_at) return true;
  try {
    const cfg = JSON.parse(tpl.trigger_value) as { cooldownMinutes?: number };
    const cooldownMs = (cfg.cooldownMinutes ?? 0) * 60_000;
    if (cooldownMs <= 0) return true;
    return Date.now() - new Date(tpl.last_generated_at).getTime() >= cooldownMs;
  } catch {
    return true;
  }
}

// Auto-trigger: finds all matching templates, respects cooldown from trigger_value JSON.
// trigger_value shape: { cooldownMinutes?: number, ...triggerSpecificConfig }
export function generateTasksFromTrigger(
  triggerType: string,
  context: Record<string, unknown>,
  db: Database,
): number {
  const templates = db
    .prepare(`SELECT * FROM recurring_task_templates WHERE trigger_type = ?`)
    .all(triggerType) as Template[];

  const now = new Date().toISOString();
  let count = 0;

  for (const tpl of templates) {
    if (!isCooledDown(tpl)) continue;
    count += createTaskFromTemplate(tpl, context, db, now);
  }

  return count;
}

// Manual trigger for a specific template by ID. When respectCooldown=true the
// cooldown window is checked (used by automatic poller triggers).
export function generateTaskFromTemplateId(
  templateId: number,
  context: Record<string, unknown>,
  db: Database,
  respectCooldown = false,
): number {
  const tpl = db
    .prepare(`SELECT * FROM recurring_task_templates WHERE id = ?`)
    .get(templateId) as Template | undefined;

  if (!tpl) return 0;
  if (respectCooldown && !isCooledDown(tpl)) return 0;

  return createTaskFromTemplate(tpl, context, db, new Date().toISOString());
}
