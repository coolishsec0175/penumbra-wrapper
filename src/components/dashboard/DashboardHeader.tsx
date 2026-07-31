import { FolderOpen, Download } from 'lucide-react';
import { getBasename } from '../../services/utils/pathUtils';
import { Button } from '../ui/button';

interface DashboardHeaderProps {
  daPath: string | null;
  preloaderPath: string | null;
  defaultOutputPath: string | null;
  isSettingsLoading: boolean;
  isCheckingUpdate?: boolean;
  onSelectDa: () => void;
  onSelectPreloader: () => void;
  onClearPreloader: () => void;
  onSelectOutput: () => void;
  onClearOutput: () => void;
  onCheckUpdates?: () => void;
}

export function DashboardHeader({
  daPath,
  preloaderPath,
  defaultOutputPath,
  isSettingsLoading,
  isCheckingUpdate = false,
  onSelectDa,
  onSelectPreloader,
  onClearPreloader,
  onSelectOutput,
  onClearOutput,
  onCheckUpdates,
}: DashboardHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-border bg-surface p-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onCheckUpdates && (
          <Button onClick={onCheckUpdates} disabled={isCheckingUpdate} size="sm">
            <Download className="h-4 w-4" />
            {isCheckingUpdate ? 'Checking...' : 'Update Antumbra'}
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">DA:</label>
            <Button onClick={onSelectDa} disabled={isSettingsLoading} variant="outline" size="sm">
              <FolderOpen className="h-4 w-4" />
              {daPath ? getBasename(daPath) : 'Select DA'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Preloader:</label>
            <Button onClick={onSelectPreloader} disabled={isSettingsLoading} variant="outline" size="sm">
              <FolderOpen className="h-4 w-4" />
              {preloaderPath ? getBasename(preloaderPath) : 'Optional'}
            </Button>
            {preloaderPath && (
              <Button onClick={onClearPreloader} disabled={isSettingsLoading} variant="destructive" size="sm" className="px-2">
                ✕
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Output:</label>
            <Button onClick={onSelectOutput} disabled={isSettingsLoading} variant="outline" size="sm">
              <FolderOpen className="h-4 w-4" />
              {defaultOutputPath ? getBasename(defaultOutputPath) : 'Select Output'}
            </Button>
            {defaultOutputPath && (
              <Button onClick={onClearOutput} disabled={isSettingsLoading} variant="destructive" size="sm" className="px-2">
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
