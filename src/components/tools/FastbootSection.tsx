import { Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Panel } from '../penumbra/Panel';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import type { FastbootStatus } from '../../types';

interface FastbootSectionProps {
  isRunning: boolean;
  status: FastbootStatus | null;
  statusMessage: string;
  onForceFastboot: () => void;
  onCancel: () => void;
}

const statusStyles: Record<FastbootStatus, string> = {
  start: 'text-muted-foreground',
  success: 'text-success',
  cancelled: 'text-muted-foreground',
  no_device: 'text-error',
  open_error: 'text-error',
  no_ack: 'text-error',
  error: 'text-error',
};

export function FastbootSection({
  isRunning,
  status,
  statusMessage,
  onForceFastboot,
  onCancel,
}: FastbootSectionProps) {
  return (
    <SpotlightCard className="overflow-hidden">
      <Panel title="FORCE FASTBOOT" accent padded={false}>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Attempts a preloader handshake to switch MTK devices into Fastboot mode.
          </p>

          <div className="flex items-center gap-2">
            {isRunning && (
              <Button onClick={onCancel} variant="outline" size="sm">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
            <Button onClick={onForceFastboot} disabled={isRunning} size="sm">
              {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRunning ? 'Attempting...' : 'Force Fastboot'}
            </Button>
          </div>

          {isRunning && (
            <p className="text-sm text-muted-foreground">
              Scanning MTK ports for up to 120 seconds. Keep the device connected.
            </p>
          )}
          {status && statusMessage && (
            <p className={`text-sm font-semibold ${statusStyles[status]}`}>{statusMessage}</p>
          )}
        </div>
      </Panel>
    </SpotlightCard>
  );
}
