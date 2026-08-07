import { FolderOpen, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Restore All Partitions</CardTitle>
        <CardDescription>
          Write every partition image back from a backup folder (write-all).
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-2">
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
      </CardContent>
    </Card>
  );
}
