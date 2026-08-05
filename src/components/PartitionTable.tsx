import { useState, useCallback, useMemo, memo } from 'react';
import type { Partition } from '../types';
import { Download, Upload, Search, Trash2, HardDriveDownload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '../store/uiStore';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

interface PartitionTableProps {
  partitions: Partition[];
  selectedPartitions: Set<string>;
  onToggleSelected: (partitionName: string) => void;
  onSelectAllSelected: (checked: boolean) => void;
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

interface Flag {
  label: string;
  className: string;
}

function getPartitionFlags(name: string): Flag[] {
  const flags: Flag[] = [];

  if (name.endsWith('_a')) {
    flags.push({ label: 'A', className: 'bg-accent text-accent-foreground' });
  } else if (name.endsWith('_b')) {
    flags.push({ label: 'B', className: 'bg-surface-hover text-muted-foreground' });
  }

  const baseName = name.replace(/_(a|b)$/, '');

  if (['system', 'vendor', 'product', 'system_ext', 'odm'].includes(baseName)) {
    flags.push({ label: 'ext4', className: 'bg-success text-success-foreground' });
    flags.push({ label: 'img', className: 'bg-surface-hover text-muted-foreground' });
  } else if (baseName === 'userdata') {
    flags.push({ label: 'f2fs', className: 'bg-success text-success-foreground' });
  } else if (
    ['boot', 'init_boot', 'vendor_boot', 'recovery', 'vbmeta', 'logo', 'dtbo'].includes(baseName)
  ) {
    flags.push({ label: 'img', className: 'bg-surface-hover text-muted-foreground' });
  } else if (
    ['seccfg', 'otp', 'proinfo', 'nvcfg', 'nvram', 'protect1', 'protect2'].includes(baseName)
  ) {
    flags.push({ label: 'Unreadable', className: 'bg-danger text-danger-foreground' });
  } else {
    flags.push({ label: 'bin', className: 'bg-surface-hover text-muted-foreground' });
  }

  return flags;
}

export const PartitionTable = memo<PartitionTableProps>(
  ({
    partitions,
    selectedPartitions,
    onToggleSelected,
    onSelectAllSelected,
    onRead,
    onWrite,
    onFormat,
    onErase,
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const compactView = useUIStore((state) => state.compactView);
    const rowPadding = compactView ? 'px-2 py-0.5' : 'px-3 py-1.5';

    const filteredPartitions = useMemo(
      () => partitions.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
      [partitions, searchTerm]
    );

    const allSelected = filteredPartitions.length > 0 &&
      filteredPartitions.every((p) => selectedPartitions.has(p.name));

    const handleCopyName = useCallback((name: string) => {
      navigator.clipboard.writeText(name);
      toast.success(`Copied "${name}" to clipboard`);
    }, []);

    const createReadHandler = useCallback((partition: Partition) => () => onRead(partition), [onRead]);
    const createWriteHandler = useCallback((partition: Partition) => () => onWrite(partition), [onWrite]);
    const createFormatHandler = useCallback((partition: Partition) => () => onFormat(partition), [onFormat]);
    const createEraseHandler = useCallback((partition: Partition) => () => onErase(partition), [onErase]);
    const createToggleHandler = useCallback(
      (name: string) => () => onToggleSelected(name),
      [onToggleSelected]
    );

    return (
      <div className="flex h-full flex-col space-y-3">
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search partitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden border-border bg-surface-alt">
          <div className="sticky top-0 z-10 grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border bg-surface px-3 py-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAllSelected(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary"
              title="Select all"
            />
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</div>
            <div className="w-36 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredPartitions.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-subtle-foreground">
                {searchTerm ? 'No partitions found matching your search' : 'No partitions available'}
              </div>
            ) : (
              filteredPartitions.map((partition) => (
                <div
                  key={partition.name}
                  className={cn(
                    'grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border transition-colors hover:bg-surface-hover',
                    rowPadding
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedPartitions.has(partition.name)}
                    onChange={createToggleHandler(partition.name)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />

                  <div className="flex items-center">
                    <button
                      onClick={() => handleCopyName(partition.name)}
                      className="truncate text-left font-mono text-sm text-primary hover:underline"
                      title={partition.name}
                    >
                      {partition.name}
                    </button>
                  </div>

                  <div className="flex items-center truncate font-mono text-sm text-muted-foreground" title={partition.start}>
                    {partition.start}
                  </div>

                  <div className="flex items-center truncate font-mono text-sm text-muted-foreground" title={partition.size}>
                    {partition.display_size || partition.size}
                  </div>

                  <div className="flex items-center gap-1">
                    {getPartitionFlags(partition.name).map((flag) => (
                      <span
                        key={flag.label}
                        className={cn(
                          'rounded px-1.5 py-px text-[10px] font-semibold uppercase',
                          flag.className
                        )}
                      >
                        {flag.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      onClick={createReadHandler(partition)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Read"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={createWriteHandler(partition)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-success"
                      title="Write"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={createFormatHandler(partition)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-danger"
                      title="Format"
                    >
                      <HardDriveDownload className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={createEraseHandler(partition)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-warning"
                      title="Erase"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="flex-shrink-0 text-sm text-subtle-foreground">
          Showing {filteredPartitions.length} of {partitions.length} partitions
        </div>
      </div>
    );
  }
);
