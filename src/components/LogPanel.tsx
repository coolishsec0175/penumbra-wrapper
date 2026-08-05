import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Terminal } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
import { ProgressWidget } from './ProgressWidget';
import { LogLineView } from './LogLineView';
import { LogToolbar } from './LogToolbar';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function LogPanel() {
  const {
    isLogPanelOpen,
    closeLogPanel,
    logPanelWidth,
    setLogPanelWidth,
    logFilter,
    logAutoscroll,
    logFontSize,
  } = useUIStore();

  const logs = useOperationStore((state) => state.logs);
  const isRunning = useOperationStore((state) => state.isRunning);
  const type = useOperationStore((state) => state.type);
  const partitionName = useOperationStore((state) => state.partitionName);
  const partitionSize = useOperationStore((state) => state.partitionSize);
  const startTime = useOperationStore((state) => state.startTime);
  const clearLogs = useOperationStore((state) => state.clearLogs);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const widthRef = useRef(logPanelWidth);

  const visibleLogs = logs.filter((log) => logFilter === 'all' || log.level === logFilter);

  const handleCopyLogs = useCallback(async () => {
    if (logs.length === 0) return;
    const text = visibleLogs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
      })
      .join('\n');
    await navigator.clipboard.writeText(text);
  }, [logs.length, visibleLogs]);

  // Auto-scroll to bottom when new logs arrive (only when autoscroll enabled)
  useEffect(() => {
    if (!isLogPanelOpen || !logAutoscroll) return;

    const scrollTimeout = setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [logs, isLogPanelOpen, logAutoscroll]);

  const handleClearLogs = useCallback(() => {
    clearLogs();
  }, [clearLogs]);

  const handleCopyAll = useCallback(() => {
    void handleCopyLogs();
  }, [handleCopyLogs]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isLogPanelOpen) return;

      if (e.key === 'Escape') {
        closeLogPanel();
        return;
      }

      if (e.ctrlKey && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        handleCopyAll();
        return;
      }

      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        handleClearLogs();
        return;
      }
    },
    [isLogPanelOpen, closeLogPanel, handleCopyAll, handleClearLogs]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Resize drag (width only — the panel is fixed to the right edge)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.9;
      const clamped = Math.min(Math.max(newWidth, minWidth), maxWidth);
      if (panelRef.current) {
        panelRef.current.style.width = `${clamped}px`;
      }
      widthRef.current = clamped;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setLogPanelWidth(widthRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setLogPanelWidth]);

  if (!isLogPanelOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-surface shadow-2xl',
        isDragging ? '' : 'transition-all duration-300 ease-out'
      )}
      style={{ width: `${logPanelWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-1/2 flex h-16 w-3 -translate-y-1/2 cursor-col-resize items-center justify-center rounded-r-md bg-primary-soft transition-colors hover:bg-primary"
        onMouseDown={() => setIsDragging(true)}
        title="Drag to resize"
      >
        <div className="h-8 w-0.5 rounded-full bg-primary-foreground/60" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Operation Logs</h2>
          <span className="rounded bg-surface-alt px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
            {visibleLogs.length}/{logs.length}
          </span>
        </div>
        <Button onClick={closeLogPanel} variant="ghost" size="icon" title="Close logs (Esc)">
          <X className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Filter + font size toolbar */}
      <div className="flex-shrink-0 border-b border-border p-2">
        <LogToolbar />
      </div>

      {/* Progress Widget - Shows operation status when running */}
      <ProgressWidget
        isActive={isRunning}
        operationType={type}
        partitionName={partitionName}
        partitionSize={partitionSize || undefined}
        startTime={startTime}
      />

      {/* Logs */}
      <div className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-xs">
        {visibleLogs.length === 0 ? (
          <div className="mt-8 text-center text-subtle-foreground">
            {logs.length === 0 ? 'No logs yet' : 'No logs match the current filter'}
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
