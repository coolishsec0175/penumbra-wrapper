import { cn } from '../lib/utils';

interface ProgressBarProps {
  /** 0-100 percentage to display in the blocky bar. */
  progress: number;
  className?: string;
  /** Already-formatted byte string for the written amount. */
  written?: string;
  /** Already-formatted byte string for the total amount. */
  total?: string;
  /** Formatted speed string, e.g. "12.3 MiB/s". */
  speed?: string;
}

const BAR_CHARS = 28;

/**
 * The Antumbra TUI progress bar: a blocky `████░░░░ 42%` fill rendered in
 * mono, with an optional `written / total  •  speed/s` readout line.
 */
export function ProgressBar({ progress, className = '', written, total, speed }: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 100);
  const filled = Math.round((clamped / 100) * BAR_CHARS);
  const empty = BAR_CHARS - filled;

  return (
    <div className={cn('font-mono text-accent', className)}>
      <div className="flex items-center gap-3 whitespace-pre">
        <span className="text-sm leading-none">
          <span className="text-accent">{'█'.repeat(filled)}</span>
          <span className="text-surface-hover">{'░'.repeat(empty)}</span>
        </span>
        <span className="text-sm tabular-nums text-accent">{Math.round(clamped)}%</span>
      </div>
      {(written || total) && (
        <div className="mt-1 text-xs tabular-nums text-muted-foreground">
          <span>{written ?? '0 B'}</span>
          <span className="text-subtle-foreground"> / {total ?? '0 B'}</span>
          {speed && (
            <>
              <span className="px-1.5 text-subtle-foreground">•</span>
              <span>{speed}/s</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
