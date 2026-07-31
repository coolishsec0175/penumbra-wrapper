import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMemo, useRef } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { useFlasherStore } from '../store/flasherStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { useFileSelection } from '../hooks/useFileSelection';
import { usePartitionOperations } from '../hooks/usePartitionOperations';
import { ScatterApi } from '../services/api/scatterApi';
import { DialogType } from '../services/dialogs/fileDialogService';
import { FlasherHeader } from '../components/flasher/FlasherHeader';
import { ScatterInfoBar } from '../components/flasher/ScatterInfoBar';
import { FlashPartitionTable } from '../components/flasher/FlashPartitionTable';
import { FlashActionBar } from '../components/flasher/FlashActionBar';
import { FlashProgressModal } from '../components/flasher/FlashProgressModal';
import { ErrorHandler } from '../services/utils/errorHandler';
import { formatHexSize } from '../services/utils/formatUtils';
import type { Partition } from '../types';

export function Flasher() {
  const { daPath, isSettingsLoading, isConnecting } = useDeviceStore();
  const { connect, isConnected } = useDeviceConnection();
  const { selectFile } = useFileSelection();
  const { writePartition, isExecuting } = usePartitionOperations();
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

  const handleSelectScatter = async () => {
    const selected = await selectFile(DialogType.SCATTER_FILE, undefined, {
      title: 'Select Scatter File',
    });

    if (selected) {
      setLoadingScatter(true);

      // Clear previous state before loading new scatter file
      setSelectedPartitions(new Set());
      setPartitionImages(new Map());

      try {
        // Automatically parse the scatter file
        const parsed = await ScatterApi.parseScatterFile(selected as string);

        setScatterFile(parsed);

        // Auto-detect image files
        const detectedImages = await ScatterApi.detectImageFiles(selected as string, parsed.partitions);

        // Ensure _b partitions share _a images if not already detected
        for (const [name, image] of detectedImages) {
          if (name.endsWith('_a')) {
            const bName = name.slice(0, -2) + '_b';
            if (!detectedImages.has(bName)) {
              detectedImages.set(bName, image);
            }
          }
        }

        setPartitionImages(detectedImages);

        // Only auto-select partitions that have image files detected
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
        // ErrorHandler now extracts message from structured errors automatically
        ErrorHandler.handle(error, 'Parse scatter file', {
          customMessage: 'Failed to parse scatter file',
        });
        setScatterFile(null);
      } finally {
        setLoadingScatter(false);
      }
    }
  };

  const handleConnectDevice = async () => {
    await connect();
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

      // Also auto-select this partition when image is selected
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

  const handleFlash = async () => {
    if (!daPath || !canFlash || !scatterFile || isFlashing || isExecuting) {
      if (!scatterFile) toast('Load a scatter file first');
      else if (!daPath) toast('No DA file selected');
      else if (!isConnected) toast('Connect a device first');
      else if (selectedCount === 0) toast('Select partitions to flash');
      else if (missingImagesCount > 0) toast(`${missingImagesCount} partition(s) missing image files`);
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

  // Memoize derived state to avoid unnecessary recalculations
  const downloadPartitions = useMemo(
    () => scatterFile?.partitions.filter((p) => p.is_download) || [],
    [scatterFile]
  );

  const selectedCount = selectedPartitions.size;
  
  // Calculate how many selected partitions have image files
  const selectedWithImagesCount = useMemo(
    () => Array.from(selectedPartitions).filter(name => partitionImages.has(name)).length,
    [selectedPartitions, partitionImages]
  );

  const missingImagesCount = selectedCount - selectedWithImagesCount;
  const canFlash = selectedCount > 0 && missingImagesCount === 0 && isConnected && !!daPath;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <FlashProgressModal
        isOpen={showFlashModal && !flashModalMinimized}
        onClose={handleFlashModalClose}
        onMinimize={handleFlashModalMinimize}
        currentPartition={currentFlashingPartition}
        currentIndex={currentFlashIndex}
        totalCount={totalFlashCount}
      />
      <FlasherHeader
        daPath={daPath}
        isConnecting={isConnecting}
        isConnected={isConnected}
        isSettingsLoading={isSettingsLoading}
        isLoadingScatter={isLoadingScatter}
        onConnect={handleConnectDevice}
        onSelectScatter={handleSelectScatter}
      />

      <main className="flex flex-1 flex-col overflow-hidden p-4">
        {!scatterFile ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <Package className="w-20 h-20 text-subtle-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Scatter File Loaded
            </h2>
            <p className="text-sm text-subtle-foreground">
              Load a scatter file (.txt or .xml) to begin batch flashing
            </p>
          </div>
        ) : (
          <>
            <ScatterInfoBar
              scatterFile={scatterFile}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />

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
      </main>
    </div>
  );
}
