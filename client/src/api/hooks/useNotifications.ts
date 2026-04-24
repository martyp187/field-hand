import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useMemo } from 'react';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data_json: string | null;
  farm_id: number | null;
  created_at: string;
}

const DISMISSED_KEY = 'fc_dismissed_notifications';

function getDismissedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<number>): void {
  // Keep only the last 500 to prevent unbounded growth
  const arr = Array.from(ids).slice(-500);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

export function dismissNotification(id: number): void {
  const ids = getDismissedIds();
  ids.add(id);
  saveDismissedIds(ids);
}

export function dismissAllNotifications(notifications: AppNotification[]): void {
  const ids = getDismissedIds();
  for (const n of notifications) ids.add(n.id);
  saveDismissedIds(ids);
}

export function useNotifications() {
  const { data = [], ...rest } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<AppNotification[]>('/api/notifications'),
    refetchInterval: 60_000,
  });

  const dismissed = getDismissedIds();
  const unread = useMemo(
    () => data.filter((n) => !dismissed.has(n.id)),
    [data, dismissed],
  );

  return { data, unread, unreadCount: unread.length, ...rest };
}

export function useNotificationsInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['notifications'] });
}
