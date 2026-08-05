import { Database, FolderOpen, HardDriveDownload, X } from 'lucide-react';
import type { Partition } from '../../types';
import { getBasename } from '../../services/utils/pathUtils';
import { PartitionSkeleton } from '../PartitionSkeleton';
import { PartitionTable } from '../PartitionTable';
import { Button } from '../ui/button';

interface PartitionSectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  isBackupRunning: boolean;
  partitions: Partition[];
  selectedPartitions: Set<string>;
  outputPath: string | null;
  onToggleSelected: (partitionName: string) => void;
  onSelectAllSelected: (checked: boolean) => void;
  onSelectOutput: () => void;
  onClearOutput: () => void;
  onFastBackup: () => void;
  onBackupSelected: () => void;
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

export function PartitionSection({
  isConnected,
  isConnecting,
  isBackupRunning,
  partitions,
  selectedPartitions,
  outputPath,
  onToggleSelected,
  onSelectAllSelected,
  onSelectOutput,
  onClearOutput,
  onFastBackup,
  onBackupSelected,
  onRead,
  onWrite,
  onFormat,
  onErase,
}: PartitionSectionProps) {
  if (!isConnected && !isConnecting) return null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Database className="h-5 w-5 text-primary" />
          Partition Table
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Output</span>
            <Button
              onClick={onSelectOutput}
              disabled={isBackupRunning}
              variant="outline"
              size="sm"
              className="max-w-44"
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {outputPath ? getBasename(outputPath) : 'Select Output'}
              </span>
            </Button>
            {outputPath && (
              <Button
                onClick={onClearOutput}
                disabled={isBackupRunning}
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                title="Clear output folder"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Button
            onClick={onBackupSelected}
            disabled={!isConnected || isConnecting || isBackupRunning || selectedPartitions.size === 0}
            variant="outline"
            size="sm"
          >
            <HardDriveDownload className="h-3.5 w-3.5" />
            {isBackupRunning ? 'Backing up...' : `Backup Selected (${selectedPartitions.size})`}
          </Button>
          <Button
            onClick={onFastBackup}
            disabled={!isConnected || isConnecting || isBackupRunning}
            variant="warning"
            size="sm"
          >
            {isBackupRunning ? 'Backing up...' : 'Backup NVRAM'}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {isConnecting ? (
          <PartitionSkeleton />
        ) : (
          <PartitionTable
            partitions={partitions}
            selectedPartitions={selectedPartitions}
            onToggleSelected={onToggleSelected}
            onSelectAllSelected={onSelectAllSelected}
            onRead={onRead}
            onWrite={onWrite}
            onFormat={onFormat}
            onErase={onErase}
          />
        )}
      </div>
    </div>
  );
}
