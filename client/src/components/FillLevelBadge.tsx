import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FillLevelBadgeProps {
  type: string;
  level: number;
}

const SKIP_TYPES = new Set(['UNKNOWN', 'AIR', 'WATER']);

export function FillLevelBadge({ type, level }: FillLevelBadgeProps) {
  if (SKIP_TYPES.has(type.toUpperCase()) || level <= 0) return null;

  const colour =
    level > 50 ? 'text-positive' : level > 20 ? 'text-warning' : 'text-destructive';

  return (
    <Badge variant="outline" className={cn('text-xs font-mono gap-1', colour)}>
      {type} {level.toFixed(0)}L
    </Badge>
  );
}
