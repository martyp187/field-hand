import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useTaskTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useGenerateFromTemplate,
  type TaskTemplate,
} from '@/api/hooks/useTasks';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const TRIGGER_TYPES = ['MANUAL', 'FUEL_LOW', 'SEASON_CHANGE'];
const CATEGORIES = ['Vehicle', 'Field', 'Harvest', 'Livestock', 'Finance', 'Maintenance', 'Other'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function triggerColour(type: string | null) {
  if (type === 'FUEL_LOW') return 'border-warning text-warning';
  if (type === 'SEASON_CHANGE') return 'border-blue-400 text-blue-400';
  return 'border-muted-foreground text-muted-foreground';
}

// ─── Create template dialog ───────────────────────────────────────────────────

function CreateTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTemplate = useCreateTemplate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('_none');
  const [priority, setPriority] = useState('MEDIUM');
  const [triggerType, setTriggerType] = useState('MANUAL');
  // FUEL_LOW extra fields
  const [fuelType, setFuelType] = useState('DIESEL');
  const [thresholdLiters, setThresholdLiters] = useState('100');
  const [cooldownMinutes, setCooldownMinutes] = useState('60');

  function reset() {
    setTitle(''); setDescription(''); setCategory('_none');
    setPriority('MEDIUM'); setTriggerType('MANUAL');
    setFuelType('DIESEL'); setThresholdLiters('100'); setCooldownMinutes('60');
  }

  function handleSubmit() {
    if (!title.trim()) return;
    const triggerValue =
      triggerType === 'FUEL_LOW'
        ? JSON.stringify({
            fuelType,
            thresholdLiters: parseFloat(thresholdLiters) || 100,
            cooldownMinutes: parseInt(cooldownMinutes) || 60,
          })
        : null;

    createTemplate.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        category: category === '_none' ? null : category,
        priority,
        triggerType,
        triggerValue,
      },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refuel {{vehicleName}}" />
            <p className="text-xs text-muted-foreground mt-1">Use {'{{'}placeholder{'}}'} for dynamic values</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trigger type</label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {triggerType === 'FUEL_LOW' && (
            <Card className="bg-muted/30">
              <CardContent className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">Auto-triggered when a vehicle fuel drops below threshold</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fuel type</label>
                    <Select value={fuelType} onValueChange={setFuelType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['DIESEL', 'DEF', 'METHANE', 'ELECTRICCHARGE'].map((f) => (
                          <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Threshold (L)</label>
                    <Input className="h-8 text-xs" type="number" value={thresholdLiters} onChange={(e) => setThresholdLiters(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cooldown (min)</label>
                    <Input className="h-8 text-xs" type="number" value={cooldownMinutes} onChange={(e) => setCooldownMinutes(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createTemplate.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template row ─────────────────────────────────────────────────────────────

function TemplateRow({ template }: { template: TaskTemplate }) {
  const deleteTemplate = useDeleteTemplate();
  const generate = useGenerateFromTemplate();

  let triggerConfig: Record<string, unknown> | null = null;
  try {
    if (template.trigger_value) triggerConfig = JSON.parse(template.trigger_value);
  } catch { /* ignore */ }

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="py-2.5 px-3">
        <p className="font-medium text-sm">{template.title}</p>
        {template.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
        )}
      </td>
      <td className="py-2.5 px-3">
        <Badge variant="outline" className={cn('text-xs', triggerColour(template.trigger_type))}>
          {template.trigger_type ?? 'MANUAL'}
        </Badge>
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{template.category ?? '—'}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{template.priority}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">
        {triggerConfig ? (
          <span className="font-mono">
            {Object.entries(triggerConfig)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </span>
        ) : '—'}
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">
        {formatRelativeTime(template.last_generated_at)}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            disabled={generate.isPending}
            onClick={() => generate.mutate({ templateId: template.id, context: {} })}
          >
            Generate now
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-destructive hover:text-destructive"
            disabled={deleteTemplate.isPending}
            onClick={() => {
              if (confirm(`Delete template "${template.title}"?`)) {
                deleteTemplate.mutate(template.id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Task templates page ──────────────────────────────────────────────────────

export function TaskTemplates() {
  const { data: templates = [], isLoading } = useTaskTemplates();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Task Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Templates auto-generate tasks when triggered by the poller, or can be run manually.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ New template</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{templates.length} templates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">Title</th>
                    <th className="text-left py-2 px-3">Trigger</th>
                    <th className="text-left py-2 px-3">Category</th>
                    <th className="text-left py-2 px-3">Priority</th>
                    <th className="text-left py-2 px-3">Config</th>
                    <th className="text-left py-2 px-3">Last generated</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => <TemplateRow key={t.id} template={t} />)}
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                        No templates yet. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateTemplateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
