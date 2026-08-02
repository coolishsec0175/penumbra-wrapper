import { useEffect, useRef } from 'react';
import type { LogEvent } from '../types';
import { LogLineView } from './LogLineView';

interface LogConsoleProps {
  logs: LogEvent[];
  className?: string;
}

export function LogConsole({ logs, className = '' }: LogConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`rounded-md border border-border bg-surface ${className}`}>
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium text-muted-foreground">Console Output</h3>
      </div>
      <div
        ref={consoleRef}
        className="h-64 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-subtle-foreground">No output yet...</p>
        ) : (
          logs.map((log) => <LogLineView key={log.id || log.timestamp} log={log} />)
        )}
      </div>
    </div>
  );
}
