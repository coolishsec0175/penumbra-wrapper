import { FolderOpen, HardDrive } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div className="rounded-lg bg-primary-soft p-3">
          <HardDrive className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-lg">Backup All Partitions</CardTitle>
          <CardDescription>
            Create a complete backup of all device partitions to a directory. You can select
            which partitions to skip.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected && partitions.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-alt p-3">
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

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 max-h-64 overflow-y-auto">
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

        <Button
          onClick={onReadAll}
          disabled={!isConnected || isReadAllRunning || backupCount === 0 || isSettingsLoading}
          size="lg"
          className="w-full"
        >
          <FolderOpen className="h-5 w-5" />
          {isReadAllRunning ? 'Backing up...' : `Backup ${backupCount} Partitions`}
        </Button>
      </CardContent>
    </Card>
  );
}
