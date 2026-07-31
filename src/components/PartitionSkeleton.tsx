import { memo } from 'react';

export const PartitionSkeleton = memo(() => {
  return (
    <div className="flex h-full flex-col space-y-3 animate-pulse">
      {/* Search Skeleton */}
      <div className="h-9 flex-shrink-0 rounded-md bg-surface-alt" />

      {/* Table Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface-alt">
        {/* Header Skeleton */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_2fr] gap-3 border-b border-border bg-surface px-3 py-2.5">
          <div className="h-4 w-16 rounded bg-surface-hover" />
          <div className="h-4 w-12 rounded bg-surface-hover" />
          <div className="h-4 w-12 rounded bg-surface-hover" />
          <div className="mx-auto h-4 w-20 rounded bg-surface-hover" />
        </div>

        {/* Body Skeleton - 8 rows */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr_1.5fr_1.5fr_2fr] gap-3 border-b border-border px-3 py-2.5"
            >
              <div className="h-4 rounded bg-surface-hover" />
              <div className="h-4 rounded bg-surface-hover" />
              <div className="h-4 rounded bg-surface-hover" />
              <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-16 rounded bg-surface-hover" />
                <div className="h-8 w-16 rounded bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Count Skeleton */}
      <div className="h-4 w-48 flex-shrink-0 rounded bg-surface-alt" />
    </div>
  );
});
