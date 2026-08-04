import { useMemo, useRef, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../store/deviceStore';
import { useFlasherStore } from '../store/flasherStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { useFileSelection } from '../hooks/useFileSelection';
import { usePartitionOperations } from '../hooks/usePartitionOperations';
import { useConfirmation } from '../hooks/useConfirmation';
import { ScatterApi } from '../services/api/scatterApi';
import { DialogType } from '../services/dialogs/fileDialogService';
import { ScatterDropzone } from '../components/flasher/ScatterDropzone';
import { ScatterInfoBar } from '../components/flasher/ScatterInfoBar';
import { FlashPartitionTable } from '../components/flasher/FlashPartitionTable';
import { FlashActionBar } from '../components/flasher/FlashActionBar';
import { FlashProgressModal } from '../components/flasher/FlashProgressModal';
import { OutputLogPanel } from '../components/flasher/OutputLogPanel';
import { ErrorHandler } from '../services/utils/errorHandler';
import { formatHexSize } from '../services/utils/formatUtils';
import { findScatterInFolder } from '../services/utils/scatterFolder';
import type { Partition } from '../types';

export function Flasher() {
  const { daPath } = useDeviceStore();
  const { isConnected } = useDeviceConnection();
  const { selectFile } = useFileSelection();
  const { writePartition, isExecuting } = usePartitionOperations();
  const { confirm } = useConfirmation();
  const {
    scatterFile,
    isLoadingScatter,
    selectedPartitions,
    partitionImages,
    isFlashing,
    currentFlashIndex,
    totalFlashCount,
    flashModalMinimized,
    showFlashModal,
    setScatterFile,
    setLoadingScatter,
    setSelectedPartitions,
    setPartitionImages,
    setFlashing,
    updateFlashProgress,
    setFlashModalMinimized,
    setFlashModalOpen,
    togglePartitionSelection,
  } = useFlasherStore();

  const flashingCancelled = useRef(false);
  const [scatterError, setScatterError] = useState<string | null>(null);

  const selectedFlashOrder = useMemo(
    () => (scatterFile?.partitions ?? [])
      .filter((partition) => selectedPartitions.has(partition.partition_name))
      .map((partition) => partition.partition_name),
    [scatterFile, selectedPartitions]
  );

  const currentFlashingPartition = useMemo(
    () => selectedFlashOrder.length > 0 && currentFlashIndex > 0
      ? selectedFlashOrder[currentFlashIndex - 1] || ''
      : '',
    [selectedFlashOrder, currentFlashIndex]
  );

  const loadScatterPath = async (path: string) => {
    setLoadingScatter(true);
    setScatterError(null);

    setSelectedPartitions(new Set());
    setPartitionImages(new Map());

    try {
      const parsed = await ScatterApi.parseScatterFile(path);
      setScatterFile(parsed);

      const detectedImages = await ScatterApi.detectImageFiles(path, parsed.partitions);

      for (const [name, image] of detectedImages) {
        if (name.endsWith('_a')) {
          const bName = name.slice(0, -2) + '_b';
          if (!detectedImages.has(bName)) {
            detectedImages.set(bName, image);
          }
        }
      }

      setPartitionImages(detectedImages);

      const partitionsWithImages = new Set(
        parsed.partitions
          .filter((p) => p.is_download && detectedImages.has(p.partition_name))
          .map((p) => p.partition_name)
      );
      setSelectedPartitions(partitionsWithImages);

      const downloadableCount = parsed.partitions.filter((p) => p.is_download).length;
      const aCount = parsed.partitions.filter((p) => p.partition_name.endsWith('_a')).length;
      const bCount = parsed.partitions.filter((p) => p.partition_name.endsWith('_b')).length;
      toast.success(`Loaded ${downloadableCount} partitions (_a:${aCount} _b:${bCount}) from ${parsed.platform}`);
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Parse scatter file', {
        customMessage: 'Failed to parse scatter file',
      });
      setScatterFile(null);
      setScatterError('Failed to parse scatter file. Make sure it is a valid MediaTek scatter layout.');
    } finally {
      setLoadingScatter(false);
    }
  };

  const handleSelectScatterFile = async () => {
    const selected = await selectFile(DialogType.SCATTER_FILE, undefined, {
      title: 'Select Scatter File',
    });
    if (selected) {
      await loadScatterPath(selected as string);
    }
  };

  const handleSelectScatterFolder = async () => {
    const selected = await selectFile(DialogType.BACKUP_FOLDER, undefined, {
      title: 'Select Firmware Folder',
    });
    if (selected) {
      const scatter = await findScatterInFolder(selected as string);
      if (!scatter) {
        toast.error('No scatter file found in the selected folder');
        return;
      }
      await loadScatterPath(scatter);
    }
  };

  const handleTogglePartition = (partitionName: string) => {
    togglePartitionSelection(partitionName);
  };

  const handleSelectImage = async (partitionName: string) => {
    const selected = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: `Select Image for ${partitionName}`,
      filters: [
        { name: 'Image Files', extensions: ['img', 'bin'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (selected) {
      const next = new Map(partitionImages);
      next.set(partitionName, selected as string);
      setPartitionImages(next);

      const nextSelected = new Set(selectedPartitions);
      nextSelected.add(partitionName);
      setSelectedPartitions(nextSelected);

      toast.success(`Image selected for ${partitionName}`);
    }
  };

  const handleSelectAll = () => {
    if (!scatterFile) return;
    const partitionsWithImages = new Set(
      scatterFile.partitions
        .filter((p) => p.is_download && partitionImages.has(p.partition_name))
        .map((p) => p.partition_name)
    );
    setSelectedPartitions(partitionsWithImages);
  };

  const handleClearAll = () => {
    setSelectedPartitions(new Set());
  };

  const handleClearScatter = () => {
    setScatterFile(null);
    setScatterError(null);
  };

  const handleFlash = async () => {
    if (!daPath || !canFlash || !scatterFile || isFlashing || isExecuting) {
      if (!scatterFile) toast('Load a scatter file first');
      else if (!daPath) toast('No DA file selected');
      else if (!isConnected) toast('Connect a device first');
      else if (selectedCount === 0) toast('Select partitions to flash');
      else if (missingImagesCount > 0) toast(`${missingImagesCount} partition(s) missing image files`);
      return;
    }

    const confirmed = await confirm({
      title: 'Flash scatter layout?',
      message: (
        <div className="space-y-2">
          <p className="font-semibold text-danger">
            READ THIS BEFORE PROCEEDING
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              Scatter flashing writes many partitions in a single run. If the scatter targets
              the wrong chip, project, or storage type, the device will be{' '}
              <span className="font-semibold">BRICKED</span>.
            </li>
            <li>
              Confirm the scatter's platform ({scatterFile.platform}) matches the connected chip.
            </li>
            <li>
              Keep the device on a reliable USB cable with enough charge; an interrupted scatter
              flash almost always bricks.
            </li>
          </ul>
          <p>
            The following <span className="font-semibold">{selectedCount}</span> partition(s)
            will be overwritten: {selectedFlashOrder.join(', ')}.
          </p>
          <p>Do you want to continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Flash',
      countdownSeconds: 15,
    });

    if (!confirmed) {
      toast('Flash cancelled', { icon: 'ℹ️' });
      return;
    }

    const selectedNames = selectedFlashOrder;
    const total = selectedNames.length;

    flashingCancelled.current = false;
    setFlashing(true, 0, total);
    setFlashModalOpen(true);

    let successCount = 0;
    let failed = false;
    let failedPartitionName = '';

    for (let i = 0; i < selectedNames.length; i++) {
      if (flashingCancelled.current) {
        toast('Flash cancelled');
        break;
      }

      const partitionName = selectedNames[i];
      const imagePath = partitionImages.get(partitionName);

      if (!imagePath) continue;

      updateFlashProgress(i + 1);

      const partition = scatterFile.partitions.find(
        (p) => p.partition_name === partitionName
      );

      if (!partition) continue;

      const partitionData: Partition = {
        name: partition.partition_name,
        start: partition.linear_start_addr,
        size: partition.partition_size,
        display_size: formatHexSize(partition.partition_size),
      };

      const success = await writePartition(partitionData, imagePath, false, false);
      if (!success) {
        failed = true;
        failedPartitionName = partitionName;
        break;
      }

      successCount++;
    }

    setFlashing(false);
    setFlashModalOpen(false);

    if (flashingCancelled.current) {
      toast(`Flash cancelled after ${successCount} partition(s)`);
    } else if (failed) {
      toast.error(`Flash failed at partition ${failedPartitionName || 'unknown'}`);
    } else {
      toast.success(`Successfully flashed ${successCount} partition(s)`);
    }
  };

  const handleFlashModalClose = () => {
    flashingCancelled.current = true;
    setFlashModalOpen(false);
  };

  const handleFlashModalMinimize = () => {
    setFlashModalOpen(false);
    setFlashModalMinimized(true);
  };

  const downloadPartitions = useMemo(
    () => scatterFile?.partitions.filter((p) => p.is_download) || [],
    [scatterFile]
  );

  const selectedCount = selectedPartitions.size;

  const selectedWithImagesCount = useMemo(
    () => Array.from(selectedPartitions).filter((name) => partitionImages.has(name)).length,
    [selectedPartitions, partitionImages]
  );

  const missingImagesCount = selectedCount - selectedWithImagesCount;
  const canFlash = selectedCount > 0 && missingImagesCount === 0 && isConnected && !!daPath;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <FlashProgressModal
        isOpen={showFlashModal && !flashModalMinimized}
        onClose={handleFlashModalClose}
        onMinimize={handleFlashModalMinimize}
        currentPartition={currentFlashingPartition}
        currentIndex={currentFlashIndex}
        totalCount={totalFlashCount}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {!scatterFile ? (
          <ScatterDropzone
            onLoadPath={loadScatterPath}
            onSelectFolder={handleSelectScatterFolder}
            onSelectFile={handleSelectScatterFile}
            isLoading={isLoadingScatter}
          />
        ) : (
          <>
            <ScatterInfoBar
              scatterFile={scatterFile}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onClearScatter={handleClearScatter}
            />

            {isFlashing && (
              <div className="flex flex-shrink-0 items-center gap-3 rounded-md border border-accent bg-accent-soft p-3">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Flashing {currentFlashIndex} of {totalFlashCount}
                  </p>
                  <p className="truncate font-mono text-xs text-accent">
                    {currentFlashingPartition || 'Starting...'}
                  </p>
                </div>
                <span className="font-mono text-sm tabular-nums text-accent">
                  {Math.round((currentFlashIndex / Math.max(totalFlashCount, 1)) * 100)}%
                </span>
              </div>
            )}

            <FlashPartitionTable
              partitions={downloadPartitions}
              selectedPartitions={selectedPartitions}
              partitionImages={partitionImages}
              onTogglePartition={handleTogglePartition}
              onSelectImage={handleSelectImage}
            />

            <FlashActionBar
              selectedCount={selectedCount}
              selectedWithImagesCount={selectedWithImagesCount}
              missingImagesCount={missingImagesCount}
              canFlash={canFlash && !isFlashing && !isExecuting}
              isFlashing={isFlashing}
              currentFlashIndex={currentFlashIndex}
              totalFlashCount={totalFlashCount}
              isConnected={isConnected}
              daPath={daPath}
              onFlash={handleFlash}
            />
          </>
        )}

        {scatterError && (
          <div className="flex-shrink-0 rounded-md border border-danger bg-danger-soft p-3 text-sm text-danger">
            <p className="flex items-center gap-2 font-semibold">
              <Zap className="h-4 w-4" />
              {scatterError}
            </p>
          </div>
        )}

        <OutputLogPanel />
      </div>
    </div>
  );
}
