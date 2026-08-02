import { Loader2, Rocket, X } from 'lucide-react';
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
  success: 'text-emerald-500',
  cancelled: 'text-muted-foreground',
  no_device: 'text-red-500',
  open_error: 'text-red-500',
  no_ack: 'text-red-500',
  error: 'text-red-500',
};

export function FastbootSection({
  isRunning,
  status,
  statusMessage,
  onForceFastboot,
  onCancel,
}: FastbootSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-alt p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-soft p-3">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Force Fastboot</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Attempts a preloader handshake to switch MTK devices into Fastboot mode.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={onCancel}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-background"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
          <button
            onClick={onForceFastboot}
            disabled={isRunning}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRunning ? 'Attempting...' : 'Force Fastboot'}
          </button>
        </div>
      </div>
      {isRunning && (
        <p className="mt-3 text-sm text-muted-foreground">
          Scanning MTK ports for up to 120 seconds. Keep the device connected.
        </p>
      )}
      {status && statusMessage && (
        <p className={`mt-3 text-sm ${statusStyles[status]}`}>{statusMessage}</p>
      )}
    </section>
  );
}
