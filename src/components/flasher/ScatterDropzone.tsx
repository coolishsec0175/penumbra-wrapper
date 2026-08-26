import { useEffect, useState } from 'react';
import { FilePlus2, FolderOpen, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { Button } from '../ui/button';
import { SpotlightCard } from '../reactbits/SpotlightCard';
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
          toast('Processing dropped path...');
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
      onDragEnter={(e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
    >
      <SpotlightCard
        spotlightColor="rgba(34, 211, 238, 0.12)"
        className={cn(
          'flex h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-all duration-300',
          isDragOver
            ? 'border-primary bg-accent-soft/50'
            : 'border-border hover:border-trace-copper hover:bg-muted/50'
        )}
      >
      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-trace-copper" />
      ) : (
        <Package className="h-8 w-8 text-muted-foreground" />
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
      </SpotlightCard>
    </div>
  );
}
