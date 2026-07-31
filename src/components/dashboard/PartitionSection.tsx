import { ChevronDown } from 'lucide-react';
import type { Partition } from '../../types';
import { PartitionSkeleton } from '../PartitionSkeleton';
import { PartitionTable } from '../PartitionTable';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface PartitionSectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  isFastBackupRunning: boolean;
  rebootDropdownOpen: boolean;
  rebootDropdownRef: React.RefObject<HTMLDivElement | null>;
  partitions: Partition[];
  onFastBackup: () => void;
  onToggleRebootDropdown: () => void;
  onRebootNormal: () => void;
  onRebootFastboot: () => void;
  onShutdown: () => void;
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

export function PartitionSection({
  isConnected,
  isConnecting,
  isFastBackupRunning,
  rebootDropdownOpen,
  rebootDropdownRef,
  partitions,
  onFastBackup,
  onToggleRebootDropdown,
  onRebootNormal,
  onRebootFastboot,
  onShutdown,
  onRead,
  onWrite,
  onFormat,
  onErase,
}: PartitionSectionProps) {
  if (!isConnected && !isConnecting) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Partition Table</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={onFastBackup}
            disabled={!isConnected || isConnecting || isFastBackupRunning}
            variant="warning"
            size="sm"
          >
            {isFastBackupRunning ? 'Backing up...' : 'Backup NVRAM'}
          </Button>

          <div className="relative" ref={rebootDropdownRef}>
            <Button
              onClick={onToggleRebootDropdown}
              disabled={!isConnected || isConnecting}
              variant="secondary"
              size="sm"
            >
              Reboot
              <ChevronDown className="h-4 w-4" />
            </Button>
            {rebootDropdownOpen && (
              <Card className="absolute right-0 z-50 mt-2 w-36 overflow-hidden border-border bg-surface p-1 shadow-lg">
                <button
                  onClick={onRebootNormal}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  Normal
                </button>
                <button
                  onClick={onRebootFastboot}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  Fastboot
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={onShutdown}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-surface-hover"
                >
                  Shutdown
                </button>
              </Card>
            )}
          </div>
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
