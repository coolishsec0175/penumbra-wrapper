import type { HTMLAttributes, Ref } from 'react';
import { cn } from '../../lib/utils';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Title rendered in the panel header bar. */
  title?: string;
  /** When true, the panel border + title use the accent color. */
  accent?: boolean;
  /** Show a glowing terminal dot next to the title. */
  dot?: boolean;
  /** Content padding; disabled when a title needs breathing room. */
  padded?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A clean modern terminal panel: rounded surface, hairline border and an
 * optional header bar with an accent title.
 */
export function Panel({
  title,
  accent,
  dot = true,
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
      {title && (
        <div className="panel-header">
          {dot && <span className="panel-dot" />}
          <span className="panel-title">{title}</span>
        </div>
      )}
      <div className={cn('h-full w-full', padded && 'p-3')}>{children}</div>
    </div>
  );
}