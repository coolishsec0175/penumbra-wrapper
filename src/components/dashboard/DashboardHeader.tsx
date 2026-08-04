import { FolderOpen, KeyRound, X } from 'lucide-react';
import { getBasename } from '../../services/utils/pathUtils';
import { Button } from '../ui/button';

interface DashboardHeaderProps {
  daPath: string | null;
  preloaderPath: string | null;
  authPath: string | null;
  defaultOutputPath: string | null;
  isSettingsLoading: boolean;
  onSelectDa: () => void;
  onSelectPreloader: () => void;
  onClearPreloader: () => void;
  onSelectAuth: () => void;
  onClearAuth: () => void;
  onSelectOutput: () => void;
  onClearOutput: () => void;
}

export function DashboardHeader({
  daPath,
  preloaderPath,
  authPath,
  defaultOutputPath,
  isSettingsLoading,
  onSelectDa,
  onSelectPreloader,
  onClearPreloader,
  onSelectAuth,
  onClearAuth,
  onSelectOutput,
  onClearOutput,
}: DashboardHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-border bg-surface backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">Files &amp; Configuration</h1>
          <p className="truncate text-xs text-subtle-foreground">
            Load the files antumbra needs before connecting
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">DA</label>
            <Button onClick={onSelectDa} disabled={isSettingsLoading} variant="outline" size="sm" className="max-w-44">
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">{daPath ? getBasename(daPath) : 'Select DA'}</span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preloader</label>
            <Button
              onClick={onSelectPreloader}
              disabled={isSettingsLoading}
              variant="outline"
              size="sm"
              className="max-w-44"
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">{preloaderPath ? getBasename(preloaderPath) : 'Optional'}</span>
            </Button>
            {preloaderPath && (
              <Button
                onClick={onClearPreloader}
                disabled={isSettingsLoading}
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                title="Clear preloader"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Auth</label>
            <Button
              onClick={onSelectAuth}
              disabled={isSettingsLoading}
              variant="outline"
              size="sm"
              className="max-w-44"
              title="DAA auth file (--auth)"
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              <span className="truncate">{authPath ? getBasename(authPath) : 'Optional'}</span>
            </Button>
            {authPath && (
              <Button
                onClick={onClearAuth}
                disabled={isSettingsLoading}
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                title="Clear auth file"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Output</label>
            <Button
              onClick={onSelectOutput}
              disabled={isSettingsLoading}
              variant="outline"
              size="sm"
              className="max-w-44"
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">{defaultOutputPath ? getBasename(defaultOutputPath) : 'Select Output'}</span>
            </Button>
            {defaultOutputPath && (
              <Button
                onClick={onClearOutput}
                disabled={isSettingsLoading}
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                title="Clear output folder"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
