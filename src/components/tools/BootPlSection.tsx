import { Loader2, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Panel } from '../penumbra/Panel';
import { SpotlightCard } from '../reactbits/SpotlightCard';

interface BootPlSectionProps {
  isConnected: boolean;
  isRunning: boolean;
  isSettingsLoading: boolean;
  filePath: string | null;
  onSelectFile: () => void;
  onClearFile: () => void;
  onBoot: () => void;
}

export function BootPlSection({
  isConnected,
  isRunning,
  isSettingsLoading,
  filePath,
  onSelectFile,
  onClearFile,
  onBoot,
}: BootPlSectionProps) {
  return (
    <SpotlightCard className="overflow-hidden">
      <Panel title="BOOT PRELOADER" accent padded={false}>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Temporarily boot a custom preloader in BootROM without verification.
          </p>

          <div className="flex flex-col gap-2">
            {filePath ? (
              <div className="flex items-center gap-2 rounded border border-border bg-muted/50 px-3 py-2 text-sm">
                <span className="flex-1 truncate font-mono" title={filePath}>
                  {filePath.split(/[\\/]/).pop()}
                </span>
                <Button
                  onClick={onClearFile}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <Button
                onClick={onSelectFile}
                disabled={isRunning}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Select Preloader File
              </Button>
            )}
          </div>

          <Button
            onClick={onBoot}
            disabled={!isConnected || isRunning || isSettingsLoading || !filePath}
            size="lg"
            className="w-full"
          >
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            {isRunning ? 'Booting...' : 'Boot Preloader'}
          </Button>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
