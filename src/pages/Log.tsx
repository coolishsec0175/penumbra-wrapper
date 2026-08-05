import { useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
import { ProgressWidget } from '../components/ProgressWidget';
import { LogLineView } from '../components/LogLineView';
import { LogToolbar } from '../components/LogToolbar';

export function Log() {
  const { logFilter, logAutoscroll, logFontSize } = useUIStore();

  const logs = useOperationStore((state) => state.logs);
  const isRunning = useOperationStore((state) => state.isRunning);
  const type = useOperationStore((state) => state.type);
  const partitionName = useOperationStore((state) => state.partitionName);
  const partitionSize = useOperationStore((state) => state.partitionSize);
  const startTime = useOperationStore((state) => state.startTime);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const visibleLogs = logs.filter((log) => logFilter === 'all' || log.level === logFilter);

  useEffect(() => {
    if (!logAutoscroll) return;
    const scrollTimeout = setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(scrollTimeout);
  }, [logs, logAutoscroll]);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex-shrink-0 border-b border-border p-2">
        <LogToolbar />
      </div>

      <ProgressWidget
        isActive={isRunning}
        operationType={type}
        partitionName={partitionName}
        partitionSize={partitionSize || undefined}
        startTime={startTime}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono">
        {visibleLogs.length === 0 ? (
          <div className="mt-16 text-center text-sm text-subtle-foreground">
            {logs.length === 0 ? 'Console is empty.' : 'No logs match the current filter'}
          </div>
        ) : (
          visibleLogs.map((log) => (
            <LogLineView key={log.id || log.timestamp} log={log} fontSize={logFontSize} />
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
