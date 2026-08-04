import { Database } from 'lucide-react';
import type { Partition } from '../../types';
import { PartitionSkeleton } from '../PartitionSkeleton';
import { PartitionTable } from '../PartitionTable';
import { Button } from '../ui/button';

interface PartitionSectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  isFastBackupRunning: boolean;
  partitions: Partition[];
  onFastBackup: () => void;
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

export function PartitionSection({
  isConnected,
  isConnecting,
  isFastBackupRunning,
  partitions,
  onFastBackup,
  onRead,
  onWrite,
  onFormat,
  onErase,
}: PartitionSectionProps) {
  if (!isConnected && !isConnecting) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Database className="h-5 w-5 text-primary" />
          Partition Table
        </h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={onFastBackup}
            disabled={!isConnected || isConnecting || isFastBackupRunning}
            variant="warning"
            size="sm"
          >
            {isFastBackupRunning ? 'Backing up...' : 'Backup NVRAM'}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isConnecting ? (
          <PartitionSkeleton />
        ) : (
          <PartitionTable
            partitions={partitions}
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
