import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePlayerTasks } from '@/api/hooks/useTasks';
import { useFarms } from '@/api/hooks/useFarms';
import { usePlayer } from '@/contexts/PlayerContext';
import { TaskCard } from './TaskBoard';

export function MyTasks() {
  const { nickname } = usePlayer();
  const { data: tasks = [], isLoading } = usePlayerTasks(nickname);
  const { data: farms = [] } = useFarms();

  const farmLookup = useMemo(() => {
    const map = new Map<number, { name: string; colour: string | null }>();
    for (const f of farms) map.set(f.farm_id, { name: f.name, colour: f.colour_hex });
    return map;
  }, [farms]);

  const open = tasks.filter((t) => t.status === 'OPEN');
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const done = tasks.filter((t) => t.status === 'DONE');

  if (!nickname) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">My Tasks</h1>
        <p className="text-muted-foreground mt-2">Set your nickname in settings to see your tasks.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">My Tasks</h1>
        <Badge variant="secondary">{nickname}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-24" />)}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tasks assigned to you yet.</p>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Open */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Open</h3>
              <Badge variant="secondary" className="text-xs">{open.length}</Badge>
            </div>
            <div className="space-y-2">
              {open.map((t) => {
                const farm = t.farm_id ? farmLookup.get(t.farm_id) : null;
                return <TaskCard key={t.id} task={t} farmName={farm?.name ?? null} farmColour={farm?.colour ?? null} nickname={nickname} />;
              })}
              {open.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No open tasks</p>}
            </div>
          </div>

          {/* In Progress */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">In Progress</h3>
              <Badge variant="secondary" className="text-xs">{inProgress.length}</Badge>
            </div>
            <div className="space-y-2">
              {inProgress.map((t) => {
                const farm = t.farm_id ? farmLookup.get(t.farm_id) : null;
                return <TaskCard key={t.id} task={t} farmName={farm?.name ?? null} farmColour={farm?.colour ?? null} nickname={nickname} />;
              })}
              {inProgress.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nothing in progress</p>}
            </div>
          </div>

          {/* Done */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Done</h3>
              <Badge variant="secondary" className="text-xs">{done.length}</Badge>
            </div>
            <div className="space-y-2">
              {done.map((t) => {
                const farm = t.farm_id ? farmLookup.get(t.farm_id) : null;
                return <TaskCard key={t.id} task={t} farmName={farm?.name ?? null} farmColour={farm?.colour ?? null} nickname={nickname} />;
              })}
              {done.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nothing completed yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
