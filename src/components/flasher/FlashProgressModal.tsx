import { useEffect, useState } from 'react';
import { Zap, Loader2, Minus } from 'lucide-react';
import { Progress } from '../ui/progress';
import { useOperationStore } from '../../store/operationStore';

export interface FlashProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  currentPartition: string;
  currentIndex: number;
  totalCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : value.toFixed(0)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '--';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatDuration(secs: number): string {
  if (secs < 0 || !isFinite(secs)) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FlashProgressModal({
  isOpen,
  onClose,
  onMinimize,
  currentPartition,
  currentIndex,
  totalCount,
}: FlashProgressModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const progress = useOperationStore((state) => state.progress);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setIsVisible(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;

  const batchPercentage = currentIndex >= totalCount ? 100 : totalCount > 0 ? (currentIndex / totalCount) * 100 : 0;
  const hasRealtime = progress && progress.total > 0 && progress.current > 0;
  const bytePercentage = hasRealtime ? progress.percentage : 0;
  const displayPercentage = hasRealtime ? bytePercentage : batchPercentage;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-lg mx-3 transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="bg-card rounded-md border-2 border-trace-copper shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 border-b border-border">
            <Zap className="w-6 h-6 text-trace-copper flex-shrink-0 mt-0.5" />
            <h2 className="text-xl font-semibold text-foreground flex-1">Flashing Partitions</h2>
            <div className="flex items-center gap-1">
              {onMinimize && (
                <button
                  onClick={onMinimize}
                  className="rounded p-1 transition-colors hover:bg-muted"
                  title="Minimize to sidebar"
                >
                  <Minus className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4 text-foreground">
            <p className="text-sm text-muted-foreground">
              Flashing partition {currentIndex} of {totalCount}...
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted p-3 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Current:</span>
                <p className="font-mono text-trace-copper truncate" title={currentPartition}>
                  {currentPartition || 'Starting...'}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-muted-foreground">Batch:</span>
                <p className="font-mono">
                  {currentIndex} / {totalCount}
                </p>
              </div>
            </div>

            {/* Real-time Progress Bar */}
            <div className="space-y-3 rounded-md border border-border bg-muted p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-trace-copper">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{hasRealtime ? (progress.message || 'Flashing...') : 'Waiting for data...'}</span>
              </div>

              <Progress value={displayPercentage} className="h-3" />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{currentPartition}</span>
                <span className="font-mono tabular-nums">{displayPercentage.toFixed(1)}%</span>
              </div>

              {/* Real-time stats */}
              {hasRealtime && (
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">Transferred</span>
                    <p className="font-mono tabular-nums text-foreground">
                      {formatBytes(progress.current)} / {formatBytes(progress.total)}
                    </p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-muted-foreground">Speed</span>
                    <p className="font-mono tabular-nums text-trace-copper">
                      {formatSpeed(progress.speed_bytes_sec || 0)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">Elapsed</span>
                    <p className="font-mono tabular-nums text-foreground">
                      {formatDuration(progress.elapsed_secs || 0)}
                    </p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-muted-foreground">ETA</span>
                    <p className="font-mono tabular-nums text-foreground">
                      {formatDuration(progress.eta_secs || 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-card p-4">
            <button
              onClick={onClose}
              className="rounded bg-error px-4 py-2 text-destructive-foreground transition-colors hover:bg-error-hover"
            >
              Cancel
            </button>
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="rounded bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Minimize
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
