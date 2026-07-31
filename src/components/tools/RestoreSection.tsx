import { FolderOpen, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

interface RestoreSectionProps {
  isConnected: boolean;
  isRestoreRunning: boolean;
  isSettingsLoading: boolean;
  backupDir: string | null;
  onSelectDir: () => void;
  onClearDir: () => void;
  onRestore: () => void;
}

export function RestoreSection({
  isConnected,
  isRestoreRunning,
  isSettingsLoading,
  backupDir,
  onSelectDir,
  onClearDir,
  onRestore,
}: RestoreSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Restore All Partitions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Write every partition image back from a backup folder (write-all).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onSelectDir} disabled={isSettingsLoading || isRestoreRunning} variant="outline" size="sm">
          <FolderOpen className="h-4 w-4" />
          {backupDir ? backupDir : 'Select Backup Folder'}
        </Button>
        {backupDir && (
          <Button onClick={onClearDir} disabled={isRestoreRunning} variant="destructive" size="sm" className="px-2">
            ✕
          </Button>
        )}
        <Button
          onClick={onRestore}
          disabled={!isConnected || isRestoreRunning || !backupDir}
          variant="warning"
          size="sm"
        >
          <RotateCcw className={`h-4 w-4 ${isRestoreRunning ? 'animate-spin' : ''}`} />
          {isRestoreRunning ? 'Restoring...' : 'Restore All'}
        </Button>
      </div>
    </section>
  );
}
