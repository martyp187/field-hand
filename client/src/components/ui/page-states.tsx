interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = 'Failed to load data.', onRetry }: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs underline text-muted-foreground hover:text-foreground"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface PageEmptyProps {
  icon?: string;
  message: string;
  hint?: string;
}

export function PageEmpty({ icon = '📭', message, hint }: PageEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground/60">{hint}</p>}
    </div>
  );
}
