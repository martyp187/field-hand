import type { SseStatus } from '@/hooks/useSseEvents';

const STATUS_CONFIG: Record<SseStatus, { icon: string; label: string; className: string }> = {
  connected: { icon: '●', label: 'Live', className: 'text-positive' },
  connecting: { icon: '●', label: 'Connecting…', className: 'text-warning animate-pulse' },
  disconnected: { icon: '●', label: 'Offline', className: 'text-destructive' },
};

export function ConnectionStatus({ status }: { status: SseStatus }) {
  const { icon, label, className } = STATUS_CONFIG[status];
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}
