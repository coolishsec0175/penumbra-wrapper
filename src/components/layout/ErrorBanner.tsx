import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useOperationStore } from '../../store/operationStore';
import { cn } from '../../lib/utils';

const AUTO_DISMISS_MS = 5000;

export function ErrorBanner() {
  const error = useOperationStore((state) => state.error);
  const clearError = useOperationStore((state) => state.clearError);
  const [progress, setProgress] = useState(1);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) return;

    const startedAt = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = 1 - elapsed / AUTO_DISMISS_MS;
      setProgress(Math.max(0, ratio));
    }, 100);

    dismissTimer.current = setTimeout(() => {
      clearError();
    }, AUTO_DISMISS_MS);

    return () => {
      clearInterval(interval);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[150] w-96 max-w-[calc(100vw-2rem)] animate-[modalEnter_200ms_ease-out]'
      )}
    >
      <div className="overflow-hidden rounded-md border border-danger bg-surface shadow-2xl">
        <div className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-danger">Error</p>
            <p className="mt-1 break-words text-sm text-foreground">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-0.5 w-full bg-surface-hover">
          <div
            className="h-full bg-danger transition-[width] duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
