import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useNotifications,
  dismissNotification,
  dismissAllNotifications,
  type AppNotification,
} from '@/api/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';

const TYPE_ICONS: Record<string, string> = {
  task_due: '⏰',
  task_overdue: '🔴',
  task_claimed: '👋',
  task_completed: '✅',
  goal_milestone: '🎯',
  fuel_low: '⛽',
  season_change: '🌿',
  farmland_acquired: '🏡',
  livestock_feed_low: '🐄',
};

function notificationIcon(type: string): string {
  return TYPE_ICONS[type] ?? '🔔';
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationItemProps {
  notification: AppNotification;
  dismissed: boolean;
  onDismiss: (id: number) => void;
}

function NotificationItem({ notification, dismissed, onDismiss }: NotificationItemProps) {
  return (
    <div
      className={`flex gap-3 px-4 py-3 border-b border-border transition-opacity ${dismissed ? 'opacity-40' : ''}`}
    >
      <span className="text-base mt-0.5 shrink-0">{notificationIcon(notification.type)}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${dismissed ? 'text-muted-foreground' : 'text-foreground'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      {!dismissed && (
        <button
          onClick={() => onDismiss(notification.id)}
          className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 text-xs mt-0.5"
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { data: notifications, unread } = useNotifications();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  function handleDismiss(id: number) {
    dismissNotification(id);
    setDismissed((prev) => new Set([...prev, id]));
  }

  function handleDismissAll() {
    dismissAllNotifications(notifications);
    setDismissed(new Set(notifications.map((n) => n.id)));
  }

  async function handleClearAll() {
    await fetch('/api/notifications', { method: 'DELETE' });
    await qc.invalidateQueries({ queryKey: ['notifications'] });
    setDismissed(new Set());
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              Notifications
              {unread.length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                  {unread.length}
                </Badge>
              )}
            </span>
            <div className="flex gap-1">
              {unread.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-muted-foreground"
                  onClick={handleDismissAll}
                >
                  Dismiss all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleClearAll()}
                >
                  Clear all
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <span className="text-3xl mb-3">🔔</span>
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Alerts for tasks, goals, and farm events will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                dismissed={dismissed.has(n.id)}
                onDismiss={handleDismiss}
              />
            ))
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
