import { Lock, Unlock, Zap, HardDrive } from 'lucide-react';

interface BootloaderSectionProps {
  isConnected: boolean;
  isSeccfgRunning: boolean;
  isSettingsLoading: boolean;
  isSlotRunning: boolean;
  isCrashRunning: boolean;
  onUnlock: () => void;
  onLock: () => void;
  onSetSlot: (slot: 'a' | 'b') => void;
  onCrash: () => void;
}

export function BootloaderSection({
  isConnected,
  isSeccfgRunning,
  isSettingsLoading,
  isSlotRunning,
  isCrashRunning,
  onUnlock,
  onLock,
  onSetSlot,
  onCrash,
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

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          Set the active A/B boot slot.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSetSlot('a')}
            disabled={!isConnected || isSlotRunning || isSettingsLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HardDrive className="w-5 h-5" />
            {isSlotRunning ? 'Setting slot A...' : 'Set Slot A'}
          </button>
          <button
            onClick={() => onSetSlot('b')}
            disabled={!isConnected || isSlotRunning || isSettingsLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HardDrive className="w-5 h-5" />
            {isSlotRunning ? 'Setting slot B...' : 'Set Slot B'}
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          Send the debug crash command to the antumbra CLI.
        </p>
        <button
          onClick={onCrash}
          disabled={!isConnected || isCrashRunning || isSettingsLoading}
          className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="w-5 h-5" />
          {isCrashRunning ? 'Crashing...' : 'Send Crash Command'}
        </button>
      </div>
    </section>
  );
}
