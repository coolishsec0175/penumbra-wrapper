import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface PenumbraDropdownProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A TUI-style dropdown (like the Antumbra Options page): a label with a
 * bordered control showing the current value + ▲/▼ glyph, and a bordered
 * overlay list when opened.
 */
export function PenumbraDropdown({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: PenumbraDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = options.findIndex((o) => o.value === value);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = options[Math.max(0, Math.min(options.length - 1, idx + delta))];
        if (next) onChange(next.value);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, options, value, onChange]);

  return (
    <div ref={rootRef} className={cn('relative flex items-center gap-3', disabled && 'opacity-40', className)}>
      <span className="shrink-0 text-sm font-bold text-foreground">{label}:</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-[3px] border bg-surface px-3 py-1.5 text-sm transition-colors',
          open ? 'border-accent text-accent' : 'border-border text-foreground hover:border-accent',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? '—'}</span>
        <span className="shrink-0 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 min-w-48 overflow-hidden rounded-[3px] border border-accent bg-surface shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-sm transition-colors',
                option.value === value
                  ? 'bg-primary-soft font-bold text-accent'
                  : 'text-foreground hover:bg-surface-hover'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
