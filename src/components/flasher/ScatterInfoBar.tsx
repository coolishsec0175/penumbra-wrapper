import { getBasename } from '../../services/utils/pathUtils';
import type { ScatterFile } from '../../types';

interface ScatterInfoBarProps {
  scatterFile: ScatterFile;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function ScatterInfoBar({ scatterFile, onSelectAll, onClearAll }: ScatterInfoBarProps) {
  return (
    <div className="mb-4 flex flex-shrink-0 items-center justify-between rounded-md border border-border bg-surface-alt p-3">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-subtle-foreground">Platform:</span>{' '}
          <span className="font-mono text-foreground">{scatterFile.platform}</span>
        </div>
        <div>
          <span className="text-subtle-foreground">Project:</span>{' '}
          <span className="font-mono text-foreground">{scatterFile.project}</span>
        </div>
        <div>
          <span className="text-subtle-foreground">Storage:</span>{' '}
          <span className="font-mono text-foreground">{scatterFile.storage_type}</span>
        </div>
        <div>
          <span className="text-subtle-foreground">File:</span>{' '}
          <span className="font-mono text-foreground text-xs">
            {getBasename(scatterFile.file_path)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className="rounded px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
        >
          Select All
        </button>
        <button
          onClick={onClearAll}
          className="rounded px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}
