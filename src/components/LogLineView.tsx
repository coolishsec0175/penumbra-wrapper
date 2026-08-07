import type { LogEvent } from '../types';
import { cn } from '../lib/utils';

const levelStyles: Record<LogEvent['level'], { badge: string; text: string }> = {
  info: { badge: 'bg-primary-soft text-primary', text: 'text-foreground' },
  success: { badge: 'bg-success-soft text-success', text: 'text-foreground' },
  warning: { badge: 'bg-warning-soft text-warning', text: 'text-foreground' },
  error: { badge: 'bg-danger-soft text-danger', text: 'text-foreground' },
};

interface LogLineViewProps {
  log: LogEvent;
  showTimestamp?: boolean;
  fontSize?: number;
  className?: string;
}

/**
 * Shared renderer for a single operation log line.
 * Used by the Log page and the Flasher output panel so every
 * log surface renders identically (level badge + timestamp + message).
 */
export function LogLineView({ log, showTimestamp = true, fontSize = 12, className }: LogLineViewProps) {
  const level = log.level in levelStyles ? log.level : 'info';
  const { badge, text } = levelStyles[level];

  return (
    <div className={cn('flex items-start gap-2 font-mono leading-relaxed', className)}>
      {showTimestamp && (
        <span className="shrink-0 tabular-nums text-subtle-foreground">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      )}
      <span
        className={cn(
          'mt-0.5 shrink-0 rounded px-1 py-px text-[10px] font-semibold uppercase leading-normal',
          badge
        )}
      >
        {level}
      </span>
      <span className={cn('break-all', text)} style={{ fontSize }}>
        {log.message}
      </span>
    </div>
  );
}
