import { FolderOpen, Download, FileClock, KeyRound } from 'lucide-react';
import { getBasename } from '../../services/utils/pathUtils';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface DashboardHeaderProps {
  daPath: string | null;
  preloaderPath: string | null;
  authPath: string | null;
  usbLog: boolean;
  verbose: boolean;
  defaultOutputPath: string | null;
  isSettingsLoading: boolean;
  isCheckingUpdate?: boolean;
  onSelectDa: () => void;
  onSelectPreloader: () => void;
  onClearPreloader: () => void;
  onSelectAuth: () => void;
  onClearAuth: () => void;
  onToggleUsbLog: () => void;
  onToggleVerbose: () => void;
  onSelectOutput: () => void;
  onClearOutput: () => void;
  onCheckUpdates?: () => void;
  onShowChangelog?: () => void;
}

export function DashboardHeader({
  daPath,
  preloaderPath,
  authPath,
  usbLog,
  verbose,
  defaultOutputPath,
  isSettingsLoading,
  isCheckingUpdate = false,
  onSelectDa,
  onSelectPreloader,
  onClearPreloader,
  onSelectAuth,
  onClearAuth,
  onToggleUsbLog,
  onToggleVerbose,
  onSelectOutput,
  onClearOutput,
  onCheckUpdates,
  onShowChangelog,
}: DashboardHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-border bg-surface p-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {onCheckUpdates && (
            <Button onClick={onCheckUpdates} disabled={isCheckingUpdate} size="sm">
              <Download className="h-4 w-4" />
              {isCheckingUpdate ? 'Checking...' : 'Update Antumbra'}
            </Button>
          )}
          {onShowChangelog && (
            <Button onClick={onShowChangelog} variant="outline" size="sm" title="View antumbra release notes">
              <FileClock className="h-4 w-4" />
              Changelog
            </Button>
          )}
        </div>

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
            <label className="text-sm font-medium text-muted-foreground">Auth:</label>
            <Button onClick={onSelectAuth} disabled={isSettingsLoading} variant="outline" size="sm" title="DAA auth file (--auth)">
              <KeyRound className="h-4 w-4" />
              {authPath ? getBasename(authPath) : 'Optional'}
            </Button>
            {authPath && (
              <Button onClick={onClearAuth} disabled={isSettingsLoading} variant="destructive" size="sm" className="px-2">
                ✕
              </Button>
            )}
          </div>

          <Button
            onClick={onToggleUsbLog}
            disabled={isSettingsLoading}
            variant="outline"
            size="sm"
            title="Pass --usb-log to antumbra"
            className={cn(usbLog && 'bg-primary text-primary-foreground')}
          >
            USB Log
          </Button>

          <Button
            onClick={onToggleVerbose}
            disabled={isSettingsLoading}
            variant="outline"
            size="sm"
            title="Pass --verbose to antumbra"
            className={cn(verbose && 'bg-primary text-primary-foreground')}
          >
            Verbose
          </Button>

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
