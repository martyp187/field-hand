import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FarmColourDot } from '@/components/FarmColourDot';
import { useTasks, useClaimTask, useUnclaimTask, useUpdateTaskStatus, useCreateTask, type Task } from '@/api/hooks/useTasks';
import { useFarms } from '@/api/hooks/useFarms';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant={priority === 'HIGH' ? 'destructive' : 'outline'}
      className={cn(
        'text-xs',
        priority === 'MEDIUM' && 'border-warning text-warning',
        priority === 'LOW' && 'border-positive text-positive',
      )}
    >
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    OPEN: 'border-muted-foreground text-muted-foreground',
    IN_PROGRESS: 'border-blue-400 text-blue-400',
    DONE: 'border-positive text-positive',
    CANCELLED: 'border-muted text-muted',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', colours[status] ?? '')}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  farmName: string | null;
  farmColour: string | null;
  nickname: string | null;
}

export function TaskCard({ task, farmName, farmColour, nickname }: TaskCardProps) {
  const claim = useClaimTask();
  const unclaim = useUnclaimTask();
  const updateStatus = useUpdateTaskStatus();

  const isOwn = task.claimed_by && nickname && task.claimed_by.toLowerCase() === nickname.toLowerCase();

  return (
    <Card className="text-sm space-y-2">
      <CardHeader className="pb-0 pt-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug flex-1">{task.title}</p>
          <PriorityBadge priority={task.priority} />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 items-center">
          {farmName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FarmColourDot colour={farmColour} />
              {farmName}
            </span>
          )}
          {task.category && (
            <Badge variant="secondary" className="text-xs">{task.category}</Badge>
          )}
          {task.due_date && (
            <span className="text-xs text-muted-foreground">
              Due {task.due_date.slice(0, 10)}
            </span>
          )}
        </div>

        {task.claimed_by && (
          <p className="text-xs text-muted-foreground">
            Claimed by <span className="font-medium text-foreground">{task.claimed_by}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {task.status === 'OPEN' && nickname && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              disabled={claim.isPending}
              onClick={() => claim.mutate({ taskId: task.id, playerNickname: nickname })}
            >
              Claim
            </Button>
          )}
          {task.status === 'IN_PROGRESS' && isOwn && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              disabled={unclaim.isPending}
              onClick={() => unclaim.mutate(task.id)}
            >
              Unclaim
            </Button>
          )}
          {(task.status === 'OPEN' || task.status === 'IN_PROGRESS') && (
            <Button
              size="sm"
              className="h-6 text-xs bg-positive hover:bg-positive/80 text-white"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ taskId: task.id, status: 'DONE' })}
            >
              Done
            </Button>
          )}
          {(task.status === 'OPEN' || task.status === 'IN_PROGRESS') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-muted-foreground"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ taskId: task.id, status: 'CANCELLED' })}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create task dialog ───────────────────────────────────────────────────────

const CATEGORIES = ['Vehicle', 'Field', 'Harvest', 'Livestock', 'Finance', 'Maintenance', 'Other'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const { data: farms = [] } = useFarms();
  const { nickname } = usePlayer();
  const createTask = useCreateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('_none');
  const [priority, setPriority] = useState('MEDIUM');
  const [farmId, setFarmId] = useState('_none');
  const [dueDate, setDueDate] = useState('');

  function reset() {
    setTitle(''); setDescription(''); setCategory('_none');
    setPriority('MEDIUM'); setFarmId('_none'); setDueDate('');
  }

  function handleSubmit() {
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        category: category === '_none' ? null : category,
        priority,
        farm_id: farmId !== '_none' ? parseInt(farmId) : null,
        due_date: dueDate || null,
        created_by_nickname: nickname,
      },
      {
        onSuccess: () => { reset(); onClose(); },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Farm</label>
              <Select value={farmId} onValueChange={setFarmId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Any farm</SelectItem>
                  {farms.map((f) => <SelectItem key={f.farm_id} value={String(f.farm_id)}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table row (needs its own hooks) ─────────────────────────────────────────

function TableTaskRow({
  task,
  farmLookup,
  nickname,
}: {
  task: Task;
  farmLookup: Map<number, { name: string; colour: string | null }>;
  nickname: string | null;
}) {
  const claim = useClaimTask();
  const unclaim = useUnclaimTask();
  const updateStatus = useUpdateTaskStatus();

  const farm = task.farm_id ? farmLookup.get(task.farm_id) : null;
  const isOwn = task.claimed_by && nickname && task.claimed_by.toLowerCase() === nickname.toLowerCase();

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="py-2 px-3 font-medium max-w-[200px] truncate">{task.title}</td>
      <td className="py-2 px-3">
        {farm ? (
          <span className="flex items-center gap-1 text-xs">
            <FarmColourDot colour={farm.colour} />
            {farm.name}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{task.category ?? '—'}</td>
      <td className="py-2 px-3"><PriorityBadge priority={task.priority} /></td>
      <td className="py-2 px-3"><StatusBadge status={task.status} /></td>
      <td className="py-2 px-3 text-xs">{task.claimed_by ?? '—'}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{task.due_date?.slice(0, 10) ?? '—'}</td>
      <td className="py-2 px-3">
        <div className="flex gap-1">
          {task.status === 'OPEN' && nickname && (
            <Button size="sm" variant="outline" className="h-6 text-xs"
              disabled={claim.isPending}
              onClick={() => claim.mutate({ taskId: task.id, playerNickname: nickname })}>
              Claim
            </Button>
          )}
          {task.status === 'IN_PROGRESS' && isOwn && (
            <Button size="sm" variant="outline" className="h-6 text-xs"
              disabled={unclaim.isPending}
              onClick={() => unclaim.mutate(task.id)}>
              Unclaim
            </Button>
          )}
          {(task.status === 'OPEN' || task.status === 'IN_PROGRESS') && (
            <Button size="sm" className="h-6 text-xs bg-positive hover:bg-positive/80 text-white"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ taskId: task.id, status: 'DONE' })}>
              Done
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  label, tasks, farmLookup, nickname,
}: {
  label: string;
  tasks: Task[];
  farmLookup: Map<number, { name: string; colour: string | null }>;
  nickname: string | null;
}) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{label}</h3>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {tasks.map((t) => {
          const farm = t.farm_id ? farmLookup.get(t.farm_id) : null;
          return (
            <TaskCard
              key={t.id}
              task={t}
              farmName={farm?.name ?? null}
              farmColour={farm?.colour ?? null}
              nickname={nickname}
            />
          );
        })}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

// ─── TaskBoard page ───────────────────────────────────────────────────────────

export function TaskBoard() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [farmFilter, setFarmFilter] = useState('_all');
  const [statusFilter, setStatusFilter] = useState('_all');
  const [categoryFilter, setCategoryFilter] = useState('_all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: farms = [] } = useFarms();
  const { nickname } = usePlayer();

  const serverFilters = {
    farmId: farmFilter !== '_all' ? parseInt(farmFilter) : undefined,
    category: categoryFilter !== '_all' ? categoryFilter : undefined,
  };
  const { data: tasks = [], isLoading } = useTasks(serverFilters);

  const farmLookup = useMemo(() => {
    const map = new Map<number, { name: string; colour: string | null }>();
    for (const f of farms) map.set(f.farm_id, { name: f.name, colour: f.colour_hex });
    return map;
  }, [farms]);

  const categories = useMemo(() => {
    const s = new Set(tasks.map((t) => t.category).filter(Boolean) as string[]);
    return [...s].sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== '_all' && t.status !== statusFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, statusFilter, search]);

  const open = filtered.filter((t) => t.status === 'OPEN');
  const inProgress = filtered.filter((t) => t.status === 'IN_PROGRESS');
  const done = filtered.filter((t) => t.status === 'DONE');

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Task Board</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button
              className={cn('px-3 py-1.5', view === 'kanban' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50')}
              onClick={() => setView('kanban')}
            >
              Kanban
            </button>
            <button
              className={cn('px-3 py-1.5 border-l border-border', view === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50')}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>+ New task</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-48 h-8 text-sm"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={farmFilter} onValueChange={setFarmFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All farms</SelectItem>
            {farms.map((f) => <SelectItem key={f.farm_id} value={String(f.farm_id)}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(farmFilter !== '_all' || statusFilter !== '_all' || categoryFilter !== '_all' || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setFarmFilter('_all'); setStatusFilter('_all'); setCategoryFilter('_all'); setSearch(''); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-48" />)}
        </div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 items-start">
          <KanbanColumn label="Open" tasks={open} farmLookup={farmLookup} nickname={nickname} />
          <KanbanColumn label="In Progress" tasks={inProgress} farmLookup={farmLookup} nickname={nickname} />
          <KanbanColumn label="Done" tasks={done} farmLookup={farmLookup} nickname={nickname} />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Farm</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-left py-2 px-3">Priority</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Claimed by</th>
                  <th className="text-left py-2 px-3">Due</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <TableTaskRow key={t.id} task={t} farmLookup={farmLookup} nickname={nickname} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
