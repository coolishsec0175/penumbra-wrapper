import { Button } from '../ui/button';
import { Panel } from '../penumbra/Panel';

interface FlashActionBarProps {
  selectedCount: number;
  selectedWithImagesCount: number;
  missingImagesCount: number;
  canFlash: boolean;
  isFlashing: boolean;
  currentFlashIndex: number;
  totalFlashCount: number;
  isConnected: boolean;
  daPath: string | null;
  onFlash: () => void;
}

export function FlashActionBar({
  selectedCount,
  selectedWithImagesCount,
  missingImagesCount,
  canFlash,
  isFlashing,
  currentFlashIndex,
  totalFlashCount,
  isConnected,
  daPath,
  onFlash,
}: FlashActionBarProps) {
  const isDisabled = !canFlash || isFlashing;

  const getTitle = (): string => {
    if (isFlashing) return 'Flashing in progress...';
    if (!daPath) return 'No DA file selected';
    if (!isConnected) return 'Connect a device first';
    if (selectedCount === 0) return 'Select partitions to flash';
    if (missingImagesCount > 0) return `${missingImagesCount} partition(s) missing image files`;
    return 'Flash selected partitions';
  };

  return (
    <Panel padded={false} className="flex-shrink-0">
      <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm text-muted-foreground">
          {isFlashing ? (
            <span className="block truncate font-semibold text-trace-copper">
              Flashing partition {currentFlashIndex} of {totalFlashCount}...
            </span>
          ) : (
            <>
              <span className="font-semibold text-foreground">{selectedCount}</span> partitions selected
              {selectedCount > 0 && (
                <span className="ml-2">({selectedWithImagesCount} with images)</span>
              )}
            </>
          )}
        </div>
        <Button
          onClick={onFlash}
          disabled={isDisabled}
          title={getTitle()}
          className="w-full sm:w-auto"
        >
          {isFlashing ? 'Flashing...' : 'Flash Selected'}
        </Button>
      </div>
    </Panel>
  );
}
