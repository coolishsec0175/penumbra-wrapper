import { Download, RefreshCw } from 'lucide-react';
import type { AntumbraUpdateInfo } from '../../types';

interface AntumbraUpdatesSectionProps {
  updateInfo: AntumbraUpdateInfo | null;
  updatablePath: string | null;
  isCheckingUpdate: boolean;
  isUpdatingAntumbra: boolean;
  onCheckUpdates: () => void;
  onUpdateAntumbra: () => void;
}

export function AntumbraUpdatesSection({
  updateInfo,
  updatablePath,
  isCheckingUpdate,
  isUpdatingAntumbra,
  onCheckUpdates,
  onUpdateAntumbra,
}: AntumbraUpdatesSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-alt p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-success-soft p-3">
          <Download className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Antumbra Updates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Check for updates and install the latest antumbra release.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-subtle-foreground">Installed</p>
          <p className="mt-2 text-sm font-mono text-foreground">
            {updateInfo?.installed_version || 'Unknown'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-subtle-foreground">Latest</p>
          <p className="mt-2 text-sm font-mono text-foreground">
            {updateInfo?.latest_version || 'Unknown'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-subtle-foreground">Status</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {updateInfo?.supported === false
              ? 'Unsupported'
              : updateInfo?.update_available
                ? 'Update available'
                : 'Up to date'}
          </p>
          {updateInfo?.message && (
            <p className="mt-1 text-xs text-subtle-foreground">{updateInfo.message}</p>
          )}
        </div>
      </div>

      {updatablePath && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-subtle-foreground">Update path</p>
          <p className="mt-2 break-all text-xs font-mono text-foreground">{updatablePath}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <button
          onClick={onCheckUpdates}
          disabled={isCheckingUpdate}
          className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          {isCheckingUpdate ? 'Checking...' : 'Check for updates'}
        </button>
        <button
          onClick={onUpdateAntumbra}
          disabled={
            isUpdatingAntumbra ||
            isCheckingUpdate ||
            !updateInfo?.supported ||
            !updateInfo?.update_available
          }
          className="flex items-center justify-center gap-2 rounded-md bg-success px-4 py-2 text-sm text-success-foreground transition-colors hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isUpdatingAntumbra ? 'Updating...' : 'Update Antumbra'}
        </button>
      </div>
    </section>
  );
}
