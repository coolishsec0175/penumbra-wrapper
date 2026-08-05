import { useEffect, useState } from 'react';
import { FilePlus2, FolderOpen, Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { findScatterInFolder } from '../../services/utils/scatterFolder';

interface ScatterDropzoneProps {
  onLoadPath: (path: string) => Promise<void>;
  onSelectFolder: () => void;
  onSelectFile: () => void;
  isLoading: boolean;
}

export function ScatterDropzone({
  onLoadPath,
  onSelectFolder,
  onSelectFile,
  isLoading,
}: ScatterDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    const setup = async () => {
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type !== 'drop') return;
        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        const dropPath = paths[0];
        void (async () => {
          toast('Processing dropped path...', { icon: '📥' });
          if (dropPath.toLowerCase().endsWith('.txt') || dropPath.toLowerCase().endsWith('.xml')) {
            await onLoadPath(dropPath);
            return;
          }
          const scatter = await findScatterInFolder(dropPath);
          if (cancelled) return;
          if (!scatter) {
            toast.error('No scatter file found in the dropped folder');
            return;
          }
          await onLoadPath(scatter);
        })();
      });
    };

    setup();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [onLoadPath]);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      className={cn(
        'flex h-28 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
        isDragOver
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-surface hover:border-accent hover:bg-surface-alt'
      )}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      ) : (
        <Package className="h-6 w-6 text-subtle-foreground" />
      )}
      <p className="px-6 text-center text-sm font-medium text-foreground">
        {isLoading
          ? 'Loading scatter file...'
          : 'Drag & drop Android firmware folder or scatter file here'}
      </p>
      {!isLoading && (
        <div className="flex items-center gap-3">
          <Button onClick={onSelectFolder} variant="outline" size="sm">
            <FolderOpen className="h-3.5 w-3.5" />
            Select Folder
          </Button>
          <Button onClick={onSelectFile} variant="outline" size="sm">
            <FilePlus2 className="h-3.5 w-3.5" />
            Select File
          </Button>
        </div>
      )}
    </div>
  );
}
