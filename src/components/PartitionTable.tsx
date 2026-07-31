import { useState, useCallback, useMemo, memo } from 'react';
import type { Partition } from '../types';
import { Download, Upload, Search, Trash2, HardDriveDownload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface PartitionTableProps {
  partitions: Partition[];
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

export const PartitionTable = memo<PartitionTableProps>(({ partitions, onRead, onWrite, onFormat, onErase }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPartitions = useMemo(
    () => partitions.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [partitions, searchTerm]
  );

  const handleCopyName = useCallback((name: string) => {
    navigator.clipboard.writeText(name);
    toast.success(`Copied "${name}" to clipboard`);
  }, []);

  const createReadHandler = useCallback((partition: Partition) => () => onRead(partition), [onRead]);
  const createWriteHandler = useCallback((partition: Partition) => () => onWrite(partition), [onWrite]);
  const createFormatHandler = useCallback((partition: Partition) => () => onFormat(partition), [onFormat]);
  const createEraseHandler = useCallback((partition: Partition) => () => onErase(partition), [onErase]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search partitions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-border bg-surface-alt">
        <div className="sticky top-0 z-10 grid grid-cols-[2fr_1.5fr_1.5fr_3fr] gap-3 border-b border-border bg-surface px-3 py-2.5">
          <div className="text-sm font-semibold text-foreground">Name</div>
          <div className="text-sm font-semibold text-foreground">Start</div>
          <div className="text-sm font-semibold text-foreground">Size</div>
          <div className="text-center text-sm font-semibold text-foreground">Actions</div>
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
                className="grid grid-cols-[2fr_1.5fr_1.5fr_3fr] gap-3 border-b border-border px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
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

                <div className="flex items-center justify-center gap-2">
                  <Button onClick={createReadHandler(partition)} size="sm">
                    <Upload className="h-4 w-4" />
                    Read
                  </Button>
                  <Button onClick={createWriteHandler(partition)} size="sm" variant="success">
                    <Download className="h-4 w-4" />
                    Write
                  </Button>
                  <Button onClick={createFormatHandler(partition)} size="sm" variant="destructive">
                    <HardDriveDownload className="h-4 w-4" />
                    Format
                  </Button>
                  <Button onClick={createEraseHandler(partition)} size="sm" variant="warning">
                    <Trash2 className="h-4 w-4" />
                    Erase
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
});
