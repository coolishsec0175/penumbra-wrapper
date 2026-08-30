import { HardDrive, Lock, Unlock, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Panel } from '../penumbra/Panel';
import { SpotlightCard } from '../reactbits/SpotlightCard';

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
    <SpotlightCard className="overflow-hidden">
      <Panel title="BOOTLOADER MANAGEMENT" accent padded={false}>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Unlock or lock the device bootloader.{' '}
            <span className="font-semibold text-warning">WARNING:</span> These operations may wipe
            all data!
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onUnlock}
              disabled={!isConnected || isSeccfgRunning || isSettingsLoading}
              variant="warning"
              size="lg"
            >
              <Unlock className="h-5 w-5" />
              {isSeccfgRunning ? 'Processing...' : 'Unlock Bootloader'}
            </Button>

            <Button
              onClick={onLock}
              disabled={!isConnected || isSeccfgRunning || isSettingsLoading}
              variant="destructive"
              size="lg"
            >
              <Lock className="h-5 w-5" />
              {isSeccfgRunning ? 'Processing...' : 'Lock Bootloader'}
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm text-muted-foreground">Set the active A/B boot slot.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => onSetSlot('a')}
                disabled={!isConnected || isSlotRunning || isSettingsLoading}
                size="lg"
              >
                <HardDrive className="h-5 w-5" />
                {isSlotRunning ? 'Setting slot A...' : 'Set Slot A'}
              </Button>
              <Button
                onClick={() => onSetSlot('b')}
                disabled={!isConnected || isSlotRunning || isSettingsLoading}
                size="lg"
              >
                <HardDrive className="h-5 w-5" />
                {isSlotRunning ? 'Setting slot B...' : 'Set Slot B'}
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Send the debug crash command to the device.
            </p>
            <Button
              onClick={onCrash}
              disabled={!isConnected || isCrashRunning || isSettingsLoading}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Zap className="h-5 w-5" />
              {isCrashRunning ? 'Crashing...' : 'Send Crash Command'}
            </Button>
          </div>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
