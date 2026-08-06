import { Loader2, Rocket, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
  no_device: 'text-danger',
  open_error: 'text-danger',
  no_ack: 'text-danger',
  error: 'text-danger',
};

export function FastbootSection({
  isRunning,
  status,
  statusMessage,
  onForceFastboot,
  onCancel,
}: FastbootSectionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div className="rounded-[3px] bg-primary-soft p-3">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg">Force Fastboot</CardTitle>
          <CardDescription>
            Attempts a preloader handshake to switch MTK devices into Fastboot mode.
          </CardDescription>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
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
      </CardHeader>

      <CardContent className="space-y-2">
        {isRunning && (
          <p className="text-sm text-muted-foreground">
            Scanning MTK ports for up to 120 seconds. Keep the device connected.
          </p>
        )}
        {status && statusMessage && (
          <p className={`text-sm ${statusStyles[status]}`}>{statusMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
