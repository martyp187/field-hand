import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useGoals, useCreateGoal, useUpdateGoalProgress, useUpdateGoalStatus, type Goal } from '@/api/hooks/useGoals';

// ─── Create goal dialog ───────────────────────────────────────────────────────

function CreateGoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createGoal = useCreateGoal();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  function reset() { setTitle(''); setDescription(''); setTargetValue(''); setUnit(''); }

  function handleSubmit() {
    if (!title.trim()) return;
    createGoal.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        targetValue: targetValue ? parseFloat(targetValue) : null,
        unit: unit.trim() || null,
      },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create goal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Earn $5,000,000" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target value</label>
              <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 5000000" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. $, ha, hours" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createGoal.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Update progress dialog ───────────────────────────────────────────────────

function UpdateProgressDialog({
  goal,
  open,
  onClose,
}: {
  goal: Goal;
  open: boolean;
  onClose: () => void;
}) {
  const updateProgress = useUpdateGoalProgress();
  const [value, setValue] = useState(String(goal.current_value));

  function handleSubmit() {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateProgress.mutate(
      { goalId: goal.id, currentValue: num },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update progress</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{goal.title}</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1"
            />
            {goal.unit && <span className="text-sm text-muted-foreground">{goal.unit}</span>}
          </div>
          {goal.target_value != null && (
            <p className="text-xs text-muted-foreground">
              Target: {goal.target_value} {goal.unit ?? ''}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateProgress.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
  const updateStatus = useUpdateGoalStatus();
  const [progressOpen, setProgressOpen] = useState(false);

  const pct =
    goal.target_value != null && goal.target_value > 0
      ? Math.min((goal.current_value / goal.target_value) * 100, 100)
      : null;

  const isActive = goal.status === 'ACTIVE';

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-snug">{goal.title}</CardTitle>
            {goal.status === 'COMPLETED' && (
              <Badge className="bg-positive text-white text-xs shrink-0">Completed</Badge>
            )}
            {goal.status === 'CANCELLED' && (
              <Badge variant="secondary" className="text-xs shrink-0">Cancelled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          {pct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {goal.current_value} {goal.unit ?? ''}
                </span>
                <span>
                  {goal.target_value} {goal.unit ?? ''}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{pct.toFixed(0)}%</p>
            </div>
          )}

          {pct === null && goal.current_value > 0 && (
            <p className="text-sm">
              Progress: <span className="font-medium">{goal.current_value} {goal.unit ?? ''}</span>
            </p>
          )}

          {isActive && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setProgressOpen(true)}>
                Update progress
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-positive hover:bg-positive/80 text-white"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ goalId: goal.id, status: 'COMPLETED' })}
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ goalId: goal.id, status: 'CANCELLED' })}
              >
                Cancel
              </Button>
            </div>
          )}

          {goal.completed_at && (
            <p className="text-xs text-muted-foreground">
              Completed {new Date(goal.completed_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {progressOpen && (
        <UpdateProgressDialog goal={goal} open={progressOpen} onClose={() => setProgressOpen(false)} />
      )}
    </>
  );
}

// ─── Goals page ───────────────────────────────────────────────────────────────

export function Goals() {
  const { data: goals = [], isLoading } = useGoals();
  const [createOpen, setCreateOpen] = useState(false);

  const active = goals.filter((g) => g.status === 'ACTIVE');
  const completed = goals.filter((g) => g.status === 'COMPLETED');
  const cancelled = goals.filter((g) => g.status === 'CANCELLED');

  function GoalGrid({ items }: { items: Goal[] }) {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-40" />)}
        </div>
      );
    }
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">No goals in this category.</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((g) => <GoalCard key={g.id} goal={g} />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Server Goals</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ New goal</Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active {active.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{active.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4"><GoalGrid items={active} /></TabsContent>
        <TabsContent value="completed" className="mt-4"><GoalGrid items={completed} /></TabsContent>
        <TabsContent value="cancelled" className="mt-4"><GoalGrid items={cancelled} /></TabsContent>
      </Tabs>

      <CreateGoalDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
