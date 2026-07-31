import { memo, useEffect, useState } from 'react';
import { Card } from './ui/card';

interface ProgressWidgetProps {
  isActive: boolean;
  operationType: 'read' | 'write' | null;
  partitionName: string | null;
  partitionSize?: string;
  startTime: number | null;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const ProgressWidget = memo<ProgressWidgetProps>(({ 
  isActive, 
  operationType, 
  partitionName,
  partitionSize,
  startTime 
}) => {
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Update spinner animation
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, [isActive]);

  // Update elapsed time
  useEffect(() => {
    if (!isActive || !startTime) return;

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  if (!isActive || !operationType || !partitionName) return null;

  const operationText = operationType === 'read' ? 'Reading' : 'Writing';

  return (
    <Card className="rounded-none border-x-0 border-b border-t border-border bg-surface-alt p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          {operationText} '{partitionName}'
          {partitionSize && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({partitionSize})
            </span>
          )}
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {elapsedTime}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-2xl text-primary animate-pulse">{SPINNER_FRAMES[spinnerIndex]}</span>
        <span className="text-sm text-muted-foreground">
          {operationType === 'read' ? 'Uploading from device...' : 'Downloading to device...'}
        </span>
      </div>
    </Card>
  );
});

ProgressWidget.displayName = 'ProgressWidget';
