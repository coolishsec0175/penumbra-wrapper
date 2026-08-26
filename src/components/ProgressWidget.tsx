import { memo, useEffect, useState } from 'react';
import { useOperationStore } from '../store/operationStore';
import { formatBytes } from '../services/utils/formatUtils';
import { ProgressBar } from './ProgressBar';
import { Panel } from './penumbra/Panel';

interface ProgressWidgetProps {
  isActive: boolean;
  operationType: 'read' | 'write' | null;
  partitionName: string | null;
  partitionSize?: string;
  startTime: number | null;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const ProgressWidget = memo<ProgressWidgetProps>(({
  isActive,
  operationType,
  partitionName,
  partitionSize,
  startTime,
}) => {
  const progress = useOperationStore((state) => state.progress);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
      setNow(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || !operationType || !partitionName) return null;

  const operationText = operationType === 'read' ? 'Reading' : 'Writing';
  const directionText =
    operationType === 'read' ? 'Uploading from device' : 'Downloading to device';
  const elapsed = startTime ? formatElapsed(Math.max(0, now - startTime)) : '00:00';

  return (
    <Panel title="PROGRESS" accent padded className="mx-4 mt-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <p className="truncate text-sm font-semibold text-foreground">
          {operationText} <span className="text-trace-copper">{partitionName}</span>
          {partitionSize && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({partitionSize})
            </span>
          )}
        </p>
        <span className="ml-3 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {elapsed}
        </span>
      </div>

      <div className="mt-2">
        {progress && progress.partition_name === partitionName ? (
          <ProgressBar
            progress={progress.percentage}
            written={formatBytes(progress.current)}
            total={formatBytes(progress.total)}
          />
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="text-base text-trace-copper">{SPINNER_FRAMES[spinnerIndex]}</span>
            <span>{directionText}...</span>
          </div>
        )}
      </div>
    </Panel>
  );
});

ProgressWidget.displayName = 'ProgressWidget';
