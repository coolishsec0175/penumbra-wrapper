import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Terminal,
  Copy,
  Save,
  Eraser,
  Minus,
  Plus,
  ArrowDownToLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore, type LogFilter } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
import { ProgressWidget } from './ProgressWidget';
import { LogLineView } from './LogLineView';
import { FileDialogService } from '../services/dialogs/fileDialogService';
import { LogApi } from '../services/api/logApi';
import { ErrorHandler } from '../services/utils/errorHandler';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const FILTERS: Array<{ key: LogFilter; label: string; activeClass: string }> = [
  { key: 'all', label: 'ALL', activeClass: 'bg-primary text-primary-foreground' },
  { key: 'info', label: 'INFO', activeClass: 'bg-primary text-primary-foreground' },
  { key: 'success', label: 'SUCCESS', activeClass: 'bg-success text-success-foreground' },
  { key: 'warning', label: 'WARN', activeClass: 'bg-warning text-warning-foreground' },
  { key: 'error', label: 'ERROR', activeClass: 'bg-danger text-danger-foreground' },
];

export function LogPanel() {
  const {
    isLogPanelOpen,
    closeLogPanel,
    logPanelWidth,
    setLogPanelWidth,
    logFilter,
    setLogFilter,
    logAutoscroll,
    setLogAutoscroll,
    logFontSize,
    setLogFontSize,
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

  const renderedLogText = useCallback(
    (lines = visibleLogs) =>
      lines
        .map((log) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
        })
        .join('\n'),
    [visibleLogs]
  );

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

  const handleCopyLogs = useCallback(async () => {
    if (logs.length === 0) {
      toast.error('No logs to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(renderedLogText());
      toast.success('Logs copied to clipboard');
    } catch (error) {
      ErrorHandler.handle(error, 'Copy logs', {
        customMessage: 'Failed to copy logs',
        addToOperationLog: false,
      });
    }
  }, [logs, renderedLogText]);

  const handleClearLogs = useCallback(() => {
    clearLogs();
    toast('Logs cleared', { icon: 'ℹ️' });
  }, [clearLogs]);

  const handleSaveLogs = useCallback(async () => {
    if (logs.length === 0) {
      toast.error('No logs to save');
      return;
    }

    try {
      const path = await FileDialogService.saveFile({
        defaultPath: 'penumbra-session.log',
        title: 'Save Session Log',
        defaultExtension: 'log',
        filters: [
          { name: 'Log Files', extensions: ['log', 'txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (!path) return;

      await LogApi.exportLogFile(path, renderedLogText());
      toast.success('Log saved');
    } catch (error) {
      ErrorHandler.handle(error, 'Save logs', {
        customMessage: 'Failed to save logs',
        addToOperationLog: false,
      });
    }
  }, [logs, renderedLogText]);

  const adjustFontSize = useCallback(
    (delta: number) => {
      setLogFontSize(Math.min(20, Math.max(10, logFontSize + delta)));
    },
    [logFontSize, setLogFontSize]
  );

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
        handleCopyLogs();
        return;
      }

      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        handleClearLogs();
        return;
      }

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveLogs();
      }
    },
    [isLogPanelOpen, closeLogPanel, handleCopyLogs, handleClearLogs, handleSaveLogs]
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
        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => setLogAutoscroll(!logAutoscroll)}
            variant="ghost"
            size="icon"
            title={logAutoscroll ? 'Autoscroll on' : 'Autoscroll off'}
          >
            <ArrowDownToLine
              className={cn(
                'h-5 w-5',
                logAutoscroll ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </Button>
          <Button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            variant="ghost"
            size="icon"
            title="Clear logs (Ctrl+L)"
          >
            <Eraser className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            onClick={handleSaveLogs}
            disabled={logs.length === 0}
            variant="ghost"
            size="icon"
            title="Save logs to file (Ctrl+S)"
          >
            <Save className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            variant="ghost"
            size="icon"
            title="Copy logs (Ctrl+C)"
          >
            <Copy className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button onClick={closeLogPanel} variant="ghost" size="icon" title="Close logs (Esc)">
            <X className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Filter + font size toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
        <div className="flex items-center gap-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setLogFilter(filter.key)}
              className={cn(
                'rounded px-2 py-1 text-[11px] font-semibold uppercase transition-colors',
                logFilter === filter.key
                  ? filter.activeClass
                  : 'bg-surface-alt text-muted-foreground hover:bg-surface-hover'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Size</span>
          <Button
            onClick={() => adjustFontSize(-1)}
            variant="outline"
            size="icon"
            className="h-6 w-6"
            title="Decrease font size"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-xs tabular-nums text-muted-foreground">
            {logFontSize}px
          </span>
          <Button
            onClick={() => adjustFontSize(1)}
            variant="outline"
            size="icon"
            className="h-6 w-6"
            title="Increase font size"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
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
