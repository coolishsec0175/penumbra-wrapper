import { FileDown, Usb } from 'lucide-react';

interface FlasherHeaderProps {
  daPath: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isSettingsLoading: boolean;
  isLoadingScatter: boolean;
  onConnect: () => void;
  onSelectScatter: () => void;
}

export function FlasherHeader({
  daPath,
  isConnecting,
  isConnected,
  isSettingsLoading,
  isLoadingScatter,
  onConnect,
  onSelectScatter,
}: FlasherHeaderProps) {
  return (
    <header className="border-b border-border p-4 bg-surface backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onConnect}
          disabled={isConnecting || !daPath || isConnected || isSettingsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!daPath ? 'Select DA file in Dashboard first' : isConnected ? 'Already connected' : 'Connect to device'}
        >
          <Usb className="w-5 h-5" />
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect Device'}
        </button>
        <button
          onClick={onSelectScatter}
          disabled={isLoadingScatter}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-5 h-5" />
          {isLoadingScatter ? 'Loading...' : 'Load Scatter File'}
        </button>
      </div>
    </header>
  );
}
