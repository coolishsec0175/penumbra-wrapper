import { IdleAnimation } from '../IdleAnimation';
import { Button } from '../ui/button';

interface ConnectionPanelProps {
  isConnecting: boolean;
  isSettingsLoading: boolean;
  daPath: string | null;
  onConnect: () => void;
}

export function ConnectionPanel({
  isConnecting,
  isSettingsLoading,
  daPath,
  onConnect,
}: ConnectionPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-foreground">Connect to Device</h2>
        <p className="text-sm text-subtle-foreground">
          Select DA file and connect your MediaTek device
        </p>
      </div>
      <Button
        onClick={onConnect}
        disabled={!daPath || isConnecting || isSettingsLoading}
        className="min-w-[200px]"
      >
        {isConnecting ? <IdleAnimation /> : 'Connect Device'}
      </Button>
    </div>
  );
}
