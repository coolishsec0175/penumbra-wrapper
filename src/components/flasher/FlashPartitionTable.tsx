import { CheckSquare, Square, FolderOpen } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { ScatterPartition } from '../../types';
import { getBasename } from '../../services/utils/pathUtils';
import { formatHexSize } from '../../services/utils/formatUtils';
import { Panel } from '../penumbra/Panel';
import { cn } from '../../lib/utils';

interface FlashPartitionTableProps {
  partitions: ScatterPartition[];
  selectedPartitions: Set<string>;
  partitionImages: Map<string, string>;
  onTogglePartition: (partitionName: string) => void;
  onSelectImage: (partitionName: string) => void;
}

export function FlashPartitionTable({
  partitions,
  selectedPartitions,
  partitionImages,
  onTogglePartition,
  onSelectImage,
}: FlashPartitionTableProps) {
  const compactView = useUIStore((state) => state.compactView);
  const rowPadding = compactView ? 'px-2 py-0.5' : 'px-3 py-1.5';

  return (
    <Panel title="PARTITIONS" accent padded={false} className="flex flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 grid grid-cols-[auto_2fr_1fr_1fr_1.5fr_2fr] items-center gap-3 border-b border-border bg-card px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select</div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partition</div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region</div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Image File</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {partitions.map((partition, index) => {
          const isSelected = selectedPartitions.has(partition.partition_name);
          const imageFile = partitionImages.get(partition.partition_name);

          return (
            <div
              key={partition.partition_name}
              className={cn(
                'grid grid-cols-[auto_2fr_1fr_1fr_1.5fr_2fr] items-center gap-3 border-b border-border transition-colors hover:bg-accent/30',
                rowPadding,
                isSelected && 'bg-accent-soft',
                !isSelected && index % 2 === 1 && 'bg-card/30'
              )}
            >
              <div className="flex items-center">
                <button
                  onClick={() => onTogglePartition(partition.partition_name)}
                  className="text-muted-foreground transition-colors hover:text-trace-copper"
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex min-w-0 items-center">
                <div className="flex min-w-0 flex-col">
                  <span
                    className="truncate font-mono text-sm text-foreground"
                    title={partition.partition_name}
                  >
                    {partition.partition_name}
                  </span>
                  {partition.file_name && (
                    <span
                      className="truncate font-mono text-xs text-muted-foreground"
                      title={partition.file_name}
                    >
                      {partition.file_name}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="flex truncate font-mono text-sm text-foreground"
                title={partition.partition_size}
              >
                {formatHexSize(partition.partition_size)}
              </div>

              <div
                className="flex truncate font-mono text-sm text-muted-foreground"
                title={partition.region}
              >
                {partition.region}
              </div>

              <div
                className="flex truncate font-mono text-xs text-muted-foreground"
                title={partition.operation_type}
              >
                {partition.operation_type}
              </div>

              <div className="flex min-w-0 items-center">
                {imageFile ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-mono text-xs text-success" title={imageFile}>
                      {getBasename(imageFile)}
                    </span>
                    <button
                      onClick={() => onSelectImage(partition.partition_name)}
                      className="flex-shrink-0 p-1 text-muted-foreground transition-colors hover:text-trace-copper"
                      title="Change image file"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectImage(partition.partition_name)}
                    className="flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-1 text-xs transition-colors hover:bg-accent/30"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Select File
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
