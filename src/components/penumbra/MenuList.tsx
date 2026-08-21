import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface MenuItem {
  /** Optional leading icon or React node. */
  icon?: ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
}

export interface MenuListProps {
  items: MenuItem[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  /** Invoked when the user presses Enter (or double-activates a row). */
  onActivate?: (index: number) => void;
  /** Invoked when the user presses Escape (defaults to resetting selection). */
  onBack?: () => void;
  className?: string;
}

/**
 * A clean terminal "description menu": a keyboard-navigable list with a live
 * description panel showing the currently selected item.
 */
export function MenuList({
  items,
  selectedIndex = 0,
  onSelect,
  onActivate,
  onBack,
  className,
}: MenuListProps) {
  const ref = useRef<HTMLDivElement>(null);

  const move = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const next = Math.max(0, Math.min(items.length - 1, selectedIndex + delta));
      onSelect?.(next);
    },
    [items.length, selectedIndex, onSelect]
  );

  const back = useCallback(() => {
    onSelect?.(0);
    onBack?.();
  }, [onSelect, onBack]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter' && onActivate) {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item && !item.disabled) onActivate(selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        back();
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [move, onActivate, items, selectedIndex, back]);

  const selected = items[selectedIndex];

  return (
    <div
      ref={ref}
      tabIndex={0}
      onFocus={(e) => e.currentTarget.setAttribute('data-focused', 'true')}
      onBlur={(e) => e.currentTarget.removeAttribute('data-focused')}
      className={cn(
        'flex w-full max-w-2xl gap-6 rounded-lg border border-border bg-surface/80 p-4 outline-none backdrop-blur-sm',
        className
      )}
    >
      <ul className="min-w-0 flex-1 space-y-1" role="menu" aria-label="Penumbra menu">
        {items.map((item, i) => {
          const active = i === selectedIndex;
          return (
            <li key={item.label}>
              <button
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  onSelect?.(i);
                  if (onActivate && !item.disabled) onActivate(i);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all disabled:opacity-40',
                  active
                    ? 'bg-primary-soft font-bold text-accent nav-glow'
                    : 'text-foreground hover:bg-surface-hover'
                )}
              >
                {item.icon !== undefined && <span className="w-5 shrink-0 text-center">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto text-[10px] font-bold text-accent">▸</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="hidden w-48 shrink-0 flex-col justify-center sm:flex">
          <div className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {selected.label}
            </p>
            <p className="mt-1 text-xs font-medium italic leading-relaxed text-accent">
              {selected.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}