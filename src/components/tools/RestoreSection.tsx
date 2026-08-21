import { FolderOpen, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Panel } from '../penumbra/Panel';
import { SpotlightCard } from '../reactbits/SpotlightCard';

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
    <SpotlightCard className="overflow-hidden">
      <Panel title="RESTORE ALL PARTITIONS" accent padded={false}>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Write every partition image back from a backup folder (write-all).
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onSelectDir}
              disabled={isSettingsLoading || isRestoreRunning}
              variant="outline"
              size="sm"
            >
              <FolderOpen className="h-4 w-4" />
              {backupDir ? backupDir : 'Select Backup Folder'}
            </Button>
            {backupDir && (
              <Button
                onClick={onClearDir}
                disabled={isRestoreRunning}
                variant="destructive"
                size="sm"
                className="px-2"
                title="Clear backup folder"
              >
                <X className="h-4 w-4" />
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
        </div>
      </Panel>
    </SpotlightCard>
  );
}
