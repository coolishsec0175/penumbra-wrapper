import { memo } from 'react';

export const PartitionSkeleton = memo(() => {
  return (
    <div className="flex h-full flex-col space-y-3 animate-pulse">
      <div className="h-9 flex-shrink-0 rounded-md bg-muted" />

      <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-border bg-muted">
        <div className="grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border bg-card px-3 py-2">
          <div className="h-4 w-4 rounded bg-accent/30" />
          <div className="h-4 w-16 rounded bg-accent/30" />
          <div className="h-4 w-12 rounded bg-accent/30" />
          <div className="h-4 w-12 rounded bg-accent/30" />
          <div className="h-4 w-12 rounded bg-accent/30" />
          <div className="h-4 w-24 rounded bg-accent/30" />
        </div>

        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border px-3 py-1.5"
            >
              <div className="h-4 w-4 rounded bg-accent/30" />
              <div className="h-4 rounded bg-accent/30" />
              <div className="h-4 rounded bg-accent/30" />
              <div className="h-4 rounded bg-accent/30" />
              <div className="h-4 rounded bg-accent/30" />
              <div className="flex items-center justify-end gap-1">
                <div className="h-7 w-7 rounded bg-accent/30" />
                <div className="h-7 w-7 rounded bg-accent/30" />
                <div className="h-7 w-7 rounded bg-accent/30" />
                <div className="h-7 w-7 rounded bg-accent/30" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-4 w-48 flex-shrink-0 rounded bg-muted" />
    </div>
  );
});
