import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Terminal, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
import { ProgressWidget } from './ProgressWidget';
import { ErrorHandler } from '../services/utils/errorHandler';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function LogPanel() {
  const { isLogPanelOpen, closeLogPanel, logPanelWidth, setLogPanelWidth } = useUIStore();
  // Select only needed properties from operation store to prevent unnecessary re-renders
  const logs = useOperationStore((state) => state.logs);
  const isRunning = useOperationStore((state) => state.isRunning);
  const type = useOperationStore((state) => state.type);
  const partitionName = useOperationStore((state) => state.partitionName);
  const partitionSize = useOperationStore((state) => state.partitionSize);
  const startTime = useOperationStore((state) => state.startTime);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Load saved width or use default (40vw)
  const [isDragging, setIsDragging] = useState(false);
  const panelWidthRef = useRef(logPanelWidth);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!isLogPanelOpen) return; // Don't scroll if panel is closed
    
    const scrollTimeout = setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100); // Small delay to prevent overlapping scrolls

    return () => clearTimeout(scrollTimeout);
  }, [logs, isLogPanelOpen]);

  const handleCopyLogs = useCallback(async () => {
    if (logs.length === 0) {
      toast.error('No logs to copy');
      return;
    }

    try {
      const logsText = logs
        .map((log) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
        })
        .join('\n');

      await navigator.clipboard.writeText(logsText);
      toast.success('Logs copied to clipboard');
    } catch (error) {
      ErrorHandler.handle(error, 'Copy logs', {
        customMessage: 'Failed to copy logs',
        addToOperationLog: false,
      });
    }
  }, [logs]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape to close panel
    if (e.key === 'Escape' && isLogPanelOpen) {
      closeLogPanel();
    }
    
    // Ctrl+C to copy logs (only when panel is open)
    if (e.ctrlKey && e.key === 'c' && isLogPanelOpen && !window.getSelection()?.toString()) {
      e.preventDefault();
      handleCopyLogs();
    }
  }, [isLogPanelOpen, closeLogPanel, handleCopyLogs]);

  // Keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle resize drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.9;
      const clamped = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      // Update DOM directly - no React re-render during drag!
      if (panelRef.current) {
        panelRef.current.style.width = `${clamped}px`;
      }
      panelWidthRef.current = clamped;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Update store when drag ends
      setLogPanelWidth(panelWidthRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setLogPanelWidth]);

  if (!isLogPanelOpen) return null;

  const getLevelColor = (level: string) => {
    if (!level) return 'text-muted-foreground';
    
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-danger';
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
        onClick={closeLogPanel}
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-surface shadow-2xl',
          isDragging ? '' : 'transition-all duration-300 ease-out'
        )}
        style={{ width: `${logPanelWidth}px` }}
      >
        {/* Resize Handle - Small centered grip */}
        <div
          className="absolute left-0 top-1/2 flex h-16 w-3 -translate-y-1/2 cursor-col-resize items-center justify-center rounded-r-md bg-primary-soft transition-colors hover:bg-primary"
          onMouseDown={() => setIsDragging(true)}
          title="Drag to resize"
        >
          <div className="h-8 w-0.5 rounded-full bg-primary-foreground/60" />
        </div>

        {/* Header */}
        <div className="ml-2 flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Operation Logs</h2>

          </div>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              variant="ghost"
              size="icon"
              title="Copy logs"
            >
              <Copy className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              onClick={closeLogPanel}
              variant="ghost"
              size="icon"
            >
              <X className="h-5 w-5 text-muted-foreground" />
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
        <div className="ml-2 flex-1 space-y-1 overflow-y-auto p-3 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="mt-8 text-center text-subtle-foreground">
              No logs yet
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id || log.timestamp} className="flex gap-2">
                <span className="shrink-0 text-subtle-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={getLevelColor(log.level)}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="break-all text-foreground">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </>
  );
}
