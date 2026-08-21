import { X } from 'lucide-react';
import { getBasename } from '../../services/utils/pathUtils';
import { Panel } from '../penumbra/Panel';
import type { ScatterFile } from '../../types';

interface ScatterInfoBarProps {
  scatterFile: ScatterFile;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClearScatter: () => void;
}

export function ScatterInfoBar({ scatterFile, onSelectAll, onClearAll, onClearScatter }: ScatterInfoBarProps) {
  return (
    <Panel padded={false} className="flex-shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-4 text-sm">
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
            <span className="font-mono text-xs text-foreground">
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
          <button
            onClick={onClearScatter}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-danger transition-colors hover:bg-danger-soft"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>
    </Panel>
  );
}
