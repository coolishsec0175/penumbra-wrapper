import type { HTMLAttributes, Ref } from 'react';
import { cn } from '../../lib/utils';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Title rendered on the top border, TUI-block style. */
  title?: string;
  /** When true, the panel border + title use the accent color. */
  accent?: boolean;
  /** Content padding; disabled when a title needs breathing room. */
  padded?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A bordered panel mirroring the Antumbra TUI block: a thin rounded border
 * with the section title sitting on the top edge.
 */
export function Panel({
  title,
  accent,
  padded = true,
  className,
  children,
  ref,
  ...props
}: PanelProps) {
  return (
    <div
      ref={ref}
      className={cn('panel', accent && 'panel-accent', className)}
      {...props}
    >
      {title && <span className="panel-title">{title}</span>}
      <div className={cn('h-full w-full', padded && 'p-3')}>{children}</div>
    </div>
  );
}
