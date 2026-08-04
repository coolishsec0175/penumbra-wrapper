import { useEffect, useRef, useState } from 'react';
import { Eraser, GripHorizontal, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '../../store/uiStore';
import { useOperationStore } from '../../store/operationStore';
import { useDeviceStore } from '../../store/deviceStore';
import { LogLineView } from '../LogLineView';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface OutputLogPanelProps {
  className?: string;
}

export function OutputLogPanel({ className }: OutputLogPanelProps) {
  const { logFilter, logAutoscroll, logFontSize, logPanelHeight, setLogPanelHeight } = useUIStore();
  const logs = useOperationStore((state) => state.logs);
  const clearLogs = useOperationStore((state) => state.clearLogs);
  const usbLog = useDeviceStore((state) => state.usbLog);
  const setUsbLog = useDeviceStore((state) => state.setUsbLog);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const heightRef = useRef(logPanelHeight);

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

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = panelRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      const clamped = Math.min(Math.max(newHeight, 80), rect.height * 0.7);
      heightRef.current = clamped;
      if (panelRef.current) {
        panelRef.current.style.height = `${clamped}px`;
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setLogPanelHeight(heightRef.current);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setLogPanelHeight]);

  return (
    <div
      ref={panelRef}
      style={{ height: `${logPanelHeight}px` }}
      className={cn(
        'flex flex-col overflow-hidden rounded-md border border-border bg-surface',
        className
      )}
    >
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <span title="Drag to resize">
          <GripHorizontal
            className="h-4 w-4 cursor-row-resize text-muted-foreground"
            onMouseDown={() => setIsDragging(true)}
          />
        </span>
        <Terminal className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          Output Log
        </span>
        <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {visibleLogs.length}/{logs.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={usbLog}
              onChange={(e) => {
                setUsbLog(e.target.checked);
                toast.success(e.target.checked ? 'UART logging enabled' : 'UART logging disabled');
              }}
              className="accent-primary"
            />
            UART Logging
          </label>
          <Button
            onClick={() => {
              clearLogs();
              toast('Logs cleared', { icon: 'ℹ️' });
            }}
            disabled={logs.length === 0}
            variant="ghost"
            size="sm"
            title="Clear logs"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 font-mono">
        {visibleLogs.length === 0 ? (
          <p className="mt-4 text-center text-xs text-subtle-foreground">
            No log output. Flashing logs will appear here.
          </p>
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
