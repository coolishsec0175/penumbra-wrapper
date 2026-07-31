import { useEffect, useState } from 'react';
import { Zap, Loader2, Minus } from 'lucide-react';
import { Progress } from '../ui/progress';

export interface FlashProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  currentPartition: string;
  currentIndex: number;
  totalCount: number;
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

  const percentage = currentIndex >= totalCount ? 100 : totalCount > 0 ? (currentIndex / totalCount) * 99 : 0;

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
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md mx-3 transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="bg-surface rounded-md border-2 border-accent shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 border-b border-border">
            <Zap className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
            <h2 className="text-xl font-semibold text-foreground flex-1">Flashing Partitions</h2>
            <div className="flex items-center gap-1">
              {onMinimize && (
                <button
                  onClick={onMinimize}
                  className="rounded p-1 transition-colors hover:bg-surface-alt"
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current:</span>
                <span className="font-mono text-sm text-accent">
                  {currentPartition}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-mono text-sm">
                  {currentIndex} / {totalCount}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3 rounded-md border border-border bg-surface-alt p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-accent">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Flashing...</span>
              </div>

              <Progress value={percentage} className="animate-pulse" />

              <div className="flex items-center justify-between text-xs text-subtle-foreground">
                <span>{currentPartition}</span>
                <span>{percentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface p-4">
            <button
              onClick={onClose}
              className="rounded bg-danger px-4 py-2 text-danger-foreground transition-colors hover:bg-danger-hover"
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
