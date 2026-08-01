import { FileImage, FolderOpen, Zap } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

interface XflashRscSectionProps {
  isConnected: boolean;
  isRscRunning: boolean;
  isSettingsLoading: boolean;
  partitionName: string;
  imagePath: string | null;
  onPartitionNameChange: (name: string) => void;
  onSelectImage: () => void;
  onClearImage: () => void;
  onFlash: () => void;
}

export function XflashRscSection({
  isConnected,
  isRscRunning,
  isSettingsLoading,
  partitionName,
  imagePath,
  onPartitionNameChange,
  onSelectImage,
  onClearImage,
  onFlash,
}: XflashRscSectionProps) {
  const canFlash = isConnected && !isRscRunning && partitionName.trim().length > 0 && !!imagePath;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Flash RSC (XFlash V5)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Flash a partition image using the RSC protocol on V5 (XFlash) devices.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Partition</label>
          <Input
            value={partitionName}
            onChange={(e) => onPartitionNameChange(e.target.value)}
            placeholder="e.g. system"
            disabled={isRscRunning}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Image File</label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSelectImage}
              disabled={isRscRunning}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <FolderOpen className="h-4 w-4" />
              {imagePath || 'Select Image'}
            </button>
            {imagePath && (
              <button
                onClick={onClearImage}
                disabled={isRscRunning}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-alt px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                title="Clear image selection"
              >
                ✕
              </button>
            )}
          </div>
          {imagePath && (
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{imagePath}</p>
          )}
        </div>
      </div>

      <button
        onClick={onFlash}
        disabled={!canFlash || isSettingsLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRscRunning ? (
          <FileImage className="h-5 w-5 animate-pulse" />
        ) : (
          <Zap className="h-5 w-5" />
        )}
        {isRscRunning ? 'Flashing...' : 'Flash RSC'}
      </button>
    </section>
  );
}
