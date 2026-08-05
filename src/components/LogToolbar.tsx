import { useCallback } from 'react';
import { ArrowDownToLine, Copy, Eraser, Minus, Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore, type LogFilter } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
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

const FILTER_BTN =
  'h-[26px] w-[70px] rounded-[2px] text-[11px] font-semibold uppercase transition-colors';

export function LogToolbar() {
  const {
    logFilter,
    setLogFilter,
    logAutoscroll,
    setLogAutoscroll,
    logFontSize,
    setLogFontSize,
  } = useUIStore();

  const logs = useOperationStore((state) => state.logs);
  const clearLogs = useOperationStore((state) => state.clearLogs);

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
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setLogFilter(filter.key)}
            className={cn(
              FILTER_BTN,
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
            FILTER_BTN,
            'flex items-center justify-center gap-1',
            logAutoscroll ? 'bg-surface-alt text-primary' : 'bg-surface-alt text-muted-foreground'
          )}
          title="Toggle autoscroll"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Auto
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
    </div>
  );
}
