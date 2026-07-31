import { Rocket } from 'lucide-react';

interface FastbootSectionProps {
  isRunning: boolean;
  onForceFastboot: () => void;
}

export function FastbootSection({ isRunning, onForceFastboot }: FastbootSectionProps) {
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
        <button
          onClick={onForceFastboot}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? 'Attempting...' : 'Force Fastboot'}
        </button>
      </div>
    </section>
  );
}
