import { useCallback, useEffect, useRef } from 'react';
import {
  ArrowDownToLine,
  Copy,
  Eraser,
  Minus,
  Plus,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore, type LogFilter } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
import { ProgressWidget } from '../components/ProgressWidget';
import { LogLineView } from '../components/LogLineView';
import { FileDialogService } from '../services/dialogs/fileDialogService';
import { LogApi } from '../services/api/logApi';
import { ErrorHandler } from '../services/utils/errorHandler';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const FILTERS: Array<{ key: LogFilter; label: string; activeClass: string }> = [
  { key: 'all', label: 'ALL', activeClass: 'bg-primary text-primary-foreground' },
  { key: 'info', label: 'INFO', activeClass: 'bg-primary text-primary-foreground' },
  { key: 'success', label: 'SUCCESS', activeClass: 'bg-success text-success-foreground' },
  { key: 'warning', label: 'WARN', activeClass: 'bg-warning text-warning-foreground' },
  { key: 'error', label: 'ERROR', activeClass: 'bg-danger text-danger-foreground' },
];

export function Log() {
  const {
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

  useEffect(() => {
    if (!logAutoscroll) return;
    const scrollTimeout = setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(scrollTimeout);
  }, [logs, logAutoscroll]);

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

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
        <div className="flex items-center gap-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setLogFilter(filter.key)}
              className={cn(
                'rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase transition-colors',
                logFilter === filter.key
                  ? filter.activeClass
                  : 'bg-surface-alt text-muted-foreground hover:bg-surface-hover'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setLogAutoscroll(!logAutoscroll)}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1.5 text-[11px] font-semibold uppercase transition-colors',
              logAutoscroll
                ? 'bg-surface-alt text-primary'
                : 'bg-surface-alt text-muted-foreground'
            )}
            title="Toggle autoscroll"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Autoscroll
          </button>
          <Button onClick={handleClearLogs} disabled={logs.length === 0} variant="outline" size="sm">
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button onClick={handleSaveLogs} disabled={logs.length === 0} variant="outline" size="sm">
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button onClick={handleCopyLogs} disabled={logs.length === 0} variant="outline" size="sm">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>

          <div className="ml-1 flex items-center gap-1.5 border-l border-border pl-2">
            <span className="text-[11px] text-muted-foreground">Size</span>
            <Button onClick={() => adjustFontSize(-1)} variant="outline" size="icon" className="h-6 w-6">
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-xs tabular-nums text-muted-foreground">
              {logFontSize}px
            </span>
            <Button onClick={() => adjustFontSize(1)} variant="outline" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
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
