import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type SseStatus = 'connecting' | 'connected' | 'disconnected';

export function useSseEvents(): SseStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SseStatus>('connecting');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource('/api/events');
      esRef.current = es;

      es.addEventListener('open', () => setStatus('connected'));

      es.addEventListener('error', () => {
        setStatus('disconnected');
        es.close();
        // Native EventSource auto-reconnects; we close and reopen to get clean state
        setTimeout(connect, 5_000);
      });

      es.addEventListener('server-update', () => {
        void qc.invalidateQueries({ queryKey: ['server'] });
      });

      es.addEventListener('farm-update', () => {
        void qc.invalidateQueries({ queryKey: ['farms'] });
        void qc.invalidateQueries({ queryKey: ['farmlands'] });
        void qc.invalidateQueries({ queryKey: ['vehicles'] });
        void qc.invalidateQueries({ queryKey: ['fields'] });
      });

      es.addEventListener('task-update', (e: MessageEvent) => {
        void qc.invalidateQueries({ queryKey: ['tasks'] });
        try {
          const data = JSON.parse(e.data) as { action: string; task?: { title: string } };
          if (data.action === 'claimed') {
            toast.info(`Task claimed: ${data.task?.title ?? ''}`);
          } else if (data.action === 'status_changed') {
            toast.success(`Task updated: ${data.task?.title ?? ''}`);
          }
        } catch {
          // ignore malformed SSE
        }
      });

      es.addEventListener('goal-update', (e: MessageEvent) => {
        void qc.invalidateQueries({ queryKey: ['goals'] });
        try {
          const data = JSON.parse(e.data) as { action: string; goal?: { title: string } };
          if (data.action === 'completed') {
            toast.success(`Goal completed: ${data.goal?.title ?? ''}`);
          }
        } catch {
          // ignore malformed SSE
        }
      });

      es.addEventListener('notification', (e: MessageEvent) => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        try {
          const data = JSON.parse(e.data) as { title: string; body?: string | null };
          toast.info(data.title, { description: data.body ?? undefined });
        } catch {
          // ignore malformed SSE
        }
      });
    };

    connect();

    return () => {
      esRef.current?.close();
    };
  }, [qc]);

  return status;
}
