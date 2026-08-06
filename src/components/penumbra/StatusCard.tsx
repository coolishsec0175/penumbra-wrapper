import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface StatusCardProps {
  label: string;
  value: string;
  className?: string;
  icon?: ReactNode;
}

/**
 * A small TUI-style status card: a bordered box showing a short label and
 * a (truncated) value, like the "☽ DA" / "⚡ PL" cards on the welcome page.
 */
export function StatusCard({ label, value, className, icon }: StatusCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-[3px] border border-border bg-surface px-3 py-1.5',
        className
      )}
    >
      {icon}
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-xs text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}
