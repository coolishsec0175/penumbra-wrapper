import { FolderOpen, HardDrive } from 'lucide-react';
import type { Partition } from '../../types';

interface ReadAllSectionProps {
  isConnected: boolean;
  isReadAllRunning: boolean;
  isSettingsLoading: boolean;
  partitions: Partition[];
  skipPartitions: Set<string>;
  backupCount: number;
  onSelectAllSkip: () => void;
  onClearAllSkip: () => void;
  onToggleSkip: (partitionName: string) => void;
  onReadAll: () => void;
}

export function ReadAllSection({
  isConnected,
  isReadAllRunning,
  isSettingsLoading,
  partitions,
  skipPartitions,
  backupCount,
  onSelectAllSkip,
  onClearAllSkip,
  onToggleSkip,
  onReadAll,
}: ReadAllSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-alt p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary-soft p-3">
          <HardDrive className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Backup All Partitions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create a complete backup of all device partitions to a directory. You can select which partitions to skip.
          </p>
        </div>
      </div>

      {isConnected && partitions.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Select Partitions to Skip ({skipPartitions.size} skipped, {backupCount} will be backed up)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={onSelectAllSkip}
              className="rounded px-3 py-1 text-xs transition-colors hover:bg-surface-hover"
              >
                Skip All
              </button>
              <button
                onClick={onClearAllSkip}
              className="rounded px-3 py-1 text-xs transition-colors hover:bg-surface-hover"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {partitions.map((partition) => {
              const isSkipped = skipPartitions.has(partition.name);
              return (
                <button
                  key={partition.name}
                  onClick={() => onToggleSkip(partition.name)}
                  className={`rounded px-3 py-2 text-left text-sm transition-colors ${
                    isSkipped
                      ? 'bg-danger-soft border border-danger text-danger'
                      : 'bg-success-soft border border-success text-success'
                  }`}
                >
                  <span className="font-mono">{partition.name}</span>
                  <span className="text-xs block text-subtle-foreground mt-0.5">
                    {partition.display_size || partition.size}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onReadAll}
        disabled={!isConnected || isReadAllRunning || backupCount === 0 || isSettingsLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FolderOpen className="w-5 h-5" />
        {isReadAllRunning ? 'Backing up...' : `Backup ${backupCount} Partitions`}
      </button>
    </section>
  );
}
