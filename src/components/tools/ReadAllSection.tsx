import { FolderOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Panel } from '../penumbra/Panel';
import { SpotlightCard } from '../reactbits/SpotlightCard';
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
    <SpotlightCard className="overflow-hidden">
      <Panel title="BACKUP ALL PARTITIONS" accent padded={false}>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Create a complete backup of all device partitions to a directory. You can select
            which partitions to skip.
          </p>

          {isConnected && partitions.length > 0 && (
            <div className="rounded-md border border-border bg-surface-alt p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Select Partitions to Skip ({skipPartitions.size} skipped, {backupCount} will be
                  backed up)
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

              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
                {partitions.map((partition) => {
                  const isSkipped = skipPartitions.has(partition.name);
                  return (
                    <button
                      key={partition.name}
                      onClick={() => onToggleSkip(partition.name)}
                      className={`rounded px-3 py-2 text-left text-sm transition-colors ${
                        isSkipped
                          ? 'border border-danger bg-danger-soft text-danger'
                          : 'border border-success bg-success-soft text-success'
                      }`}
                    >
                      <span className="font-mono">{partition.name}</span>
                      <span className="mt-0.5 block text-xs text-subtle-foreground">
                        {partition.display_size || partition.size}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            onClick={onReadAll}
            disabled={!isConnected || isReadAllRunning || backupCount === 0 || isSettingsLoading}
            size="lg"
            className="w-full"
          >
            <FolderOpen className="h-5 w-5" />
            {isReadAllRunning ? 'Backing up...' : `Backup ${backupCount} Partitions`}
          </Button>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
