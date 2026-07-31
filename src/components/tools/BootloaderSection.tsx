import { Lock, Unlock } from 'lucide-react';

interface BootloaderSectionProps {
  isConnected: boolean;
  isSeccfgRunning: boolean;
  isSettingsLoading: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

export function BootloaderSection({
  isConnected,
  isSeccfgRunning,
  isSettingsLoading,
  onUnlock,
  onLock,
}: BootloaderSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-alt p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-warning-soft p-3">
          <Lock className="w-6 h-6 text-warning" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Bootloader Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unlock or lock the device bootloader. <span className="text-warning font-semibold">WARNING:</span> These operations may wipe all data!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onUnlock}
          disabled={!isConnected || isSeccfgRunning || isSettingsLoading}
        className="flex items-center justify-center gap-2 rounded-lg bg-warning px-5 py-2.5 font-medium text-warning-foreground transition-colors hover:bg-warning-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Unlock className="w-5 h-5" />
          {isSeccfgRunning ? 'Processing...' : 'Unlock Bootloader'}
        </button>

        <button
          onClick={onLock}
          disabled={!isConnected || isSeccfgRunning || isSettingsLoading}
        className="flex items-center justify-center gap-2 rounded-lg bg-danger px-5 py-2.5 font-medium text-danger-foreground transition-colors hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
          <Lock className="w-5 h-5" />
          {isSeccfgRunning ? 'Processing...' : 'Lock Bootloader'}
        </button>
      </div>
    </section>
  );
}
