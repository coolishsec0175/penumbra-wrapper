import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="max-w-md rounded-md border border-danger bg-surface p-4 mx-3">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-danger" />
              <h2 className="text-xl font-semibold text-foreground">
                Something went wrong
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The log panel encountered an error. Please try closing and reopening it.
            </p>
            {this.state.error && (
              <pre className="max-h-32 overflow-auto rounded bg-surface-alt p-3 text-xs text-danger">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-4 w-full rounded bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
