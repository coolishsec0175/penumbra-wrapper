import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface StatusCardProps {
  label: string;
  value: string;
  className?: string;
  icon?: ReactNode;
}

/**
 * A clean terminal status pill showing a short label and a truncated value.
 */
export function StatusCard({ label, value, className, icon }: StatusCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-xs text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}