import { cn } from '@/lib/utils';

interface FarmColourDotProps {
  colour: string | null | undefined;
  className?: string;
}

export function FarmColourDot({ colour, className }: FarmColourDotProps) {
  return (
    <span
      className={cn('inline-block rounded-full', className ?? 'w-2.5 h-2.5')}
      style={{ backgroundColor: colour ?? '#6b7280' }}
    />
  );
}
