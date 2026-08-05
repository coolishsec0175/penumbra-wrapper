import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useUIStore } from '../store/uiStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { usePartitionOperations } from '../hooks/usePartitionOperations';
import { useFileSelection } from '../hooks/useFileSelection';
import { ConnectionPanel } from '../components/dashboard/ConnectionPanel';
import { PartitionSection } from '../components/dashboard/PartitionSection';
import { OperationModal } from '../components/OperationModal';
import { useConfirmation } from '../hooks/useConfirmation';
import { DialogType } from '../services/dialogs/fileDialogService';
import { PartitionApi } from '../services/api/partitionApi';
import { executeOperation } from '../services/operations/executeOperation';
import { generateTimestampedFilename, joinPath, getBasename } from '../services/utils/pathUtils';
import { ErrorHandler } from '../services/utils/errorHandler';
import toast from 'react-hot-toast';
import type { Partition } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from '@tauri-apps/plugin-fs';

const CRITICAL_PARTITIONS = ['nvram', 'nvdata', 'nvcfg', 'proinfo', 'protect1', 'protect2'];

export function Dashboard() {
  const { daPath, preloaderPath, defaultOutputPath, isSettingsLoading, setDefaultOutputPath } =
    useDeviceStore();

  const { partitions } = usePartitionStore();
  const { addLog, clearLogs } = useOperationStore();
  const { openLogPanel } = useUIStore();

  const { connect, isConnected, isConnecting } = useDeviceConnection();
  const { formatPartition, erasePartition } = usePartitionOperations();
  const { selectFile } = useFileSelection();
  const { confirm } = useConfirmation();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    partition: Partition | null;
    operation: 'read' | 'write';
  }>({
    isOpen: false,
    partition: null,
    operation: 'read',
  });

  const [selectedPartitions, setSelectedPartitions] = useState<Set<string>>(new Set());
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupAbortController, setBackupAbortController] = useState<AbortController | null>(null);
  const backupCancelReasonRef = useRef<'disconnect' | null>(null);

  // Cleanup: abort backup on unmount or disconnect
  useEffect(() => {
    return () => {
      if (backupAbortController) {
        backupAbortController.abort();
      }
    };
  }, [backupAbortController]);

  // Cancel backup if device disconnects
  useEffect(() => {
    if (!isConnected && backupAbortController) {
      backupCancelReasonRef.current = 'disconnect';
      backupAbortController.abort();
    }
  }, [isConnected, backupAbortController]);

  const handleSelectOutput = async () => {
    const path = await selectFile(DialogType.OUTPUT_FOLDER);
    if (path) {
      await setDefaultOutputPath(path);
      toast.success('Default output folder selected');
    }
  };

  const handleClearOutput = async () => {
    await setDefaultOutputPath(null);
    toast.success('Default output folder cleared');
  };

  const handleConnect = async () => {
    await connect();
  };

  const backupPartitions = async (targets: Partition[], backupLabel: string) => {
    if (!daPath || !isConnected) return;

    if (!defaultOutputPath) {
      toast.error('Please set a default output path first');
      return;
    }

    if (targets.length === 0) {
      toast.error('No partitions selected');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputDir = joinPath(defaultOutputPath, `${backupLabel}-${timestamp}`);

    const confirmed = await confirm({
      title: `Backup ${backupLabel}`,
      message: `This will backup ${targets.length} partition(s) (${targets.map((p) => p.name).join(', ')}) to your default output folder under ${getBasename(outputDir)}.\n\nContinue?`,
      variant: 'info',
      confirmText: 'Backup',
    });

    if (!confirmed) {
      toast('Backup cancelled', { icon: 'ℹ️' });
      return;
    }

    openLogPanel();
    clearLogs();
    setIsBackupRunning(true);
    backupCancelReasonRef.current = null;

    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error: unknown) {
      setIsBackupRunning(false);
      setBackupAbortController(null);
      ErrorHandler.handle(error, `Create ${backupLabel} backup folder`);
      return;
    }

    const abortController = new AbortController();
    setBackupAbortController(abortController);

    addLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting backup for ${targets.length} partitions...`,
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      if (abortController.signal.aborted) {
        const reasonMessage =
          backupCancelReasonRef.current === 'disconnect'
            ? 'Backup stopped after current partition because the device disconnected'
            : 'Backup cancelled by user';
        addLog({
          timestamp: new Date().toISOString(),
          level: 'warning',
          message: reasonMessage,
        });
        toast(reasonMessage, { icon: 'ℹ️' });
        break;
      }

      const partition = targets[i];
      const filename = generateTimestampedFilename(partition.name, 'img');
      const outputPath = joinPath(outputDir, filename);

      const operationId = uuidv4();
      const result = await executeOperation({
        operation: `Backup ${partition.name}`,
        type: 'read',
        partitionName: partition.name,
        partitionSize: partition.display_size,
        operationId,
        clearLogs: false,
        openLogPanel: false,
        handleSuccess: false,
        errorOptions: {
          showToast: false,
        },
        run: (opId) =>
          PartitionApi.read({
            daPath,
            partition: partition.name,
            outputPath,
            preloaderPath: preloaderPath || undefined,
            operationId: opId,
          }),
      });
      if (!result.success) {
        failCount++;
        toast.error(`✗ ${partition.name} failed`);
        continue;
      }
      successCount++;
      toast.success(`✓ ${partition.name} (${i + 1}/${targets.length})`);
    }

    if (failCount === 0) {
      toast.success(`Backup complete! ${successCount} partitions backed up`);
    } else {
      toast(`Backup complete: ${successCount} succeeded, ${failCount} failed`, {
        icon: '⚠️',
      });
    }

    setIsBackupRunning(false);
    setBackupAbortController(null);
  };

  const handleFastBackup = () => {
    const availablePartitions = partitions.filter((p) =>
      CRITICAL_PARTITIONS.includes(p.name.toLowerCase())
    );
    void backupPartitions(availablePartitions, 'NVRAM');
  };

  const handleBackupSelected = () => {
    const targets = partitions.filter((p) => selectedPartitions.has(p.name));
    void backupPartitions(targets, 'Backup');
  };

  const handleToggleSelected = useCallback((name: string) => {
    setSelectedPartitions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleSelectAllSelected = useCallback(
    (checked: boolean) => {
      setSelectedPartitions(checked ? new Set(partitions.map((p) => p.name)) : new Set());
    },
    [partitions]
  );

  const handleRead = (partition: Partition) => {
    setModalState({
      isOpen: true,
      partition,
      operation: 'read',
    });
  };

  const handleWrite = (partition: Partition) => {
    setModalState({
      isOpen: true,
      partition,
      operation: 'write',
    });
  };

  const handleFormat = async (partition: Partition) => {
    const confirmed = await confirm({
      title: 'Format Partition',
      message: `This will FORMAT the "${partition.name}" partition.\n\nAll data will be permanently erased!\n\nContinue?`,
      variant: 'danger',
      confirmText: 'Format',
      countdownSeconds: 15,
    });

    if (!confirmed) {
      toast('Format cancelled', { icon: 'ℹ️' });
      return;
    }

    openLogPanel();
    await formatPartition(partition);
  };

  const handleErase = async (partition: Partition) => {
    const confirmed = await confirm({
      title: 'Erase Partition',
      message: `This will ERASE the "${partition.name}" partition.\n\nAll data will be permanently deleted!\n\nContinue?`,
      variant: 'danger',
      confirmText: 'Erase',
      countdownSeconds: 15,
    });

    if (!confirmed) {
      toast('Erase cancelled', { icon: 'ℹ️' });
      return;
    }

    openLogPanel();
    await erasePartition(partition);
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      partition: null,
      operation: 'read',
    });
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-hidden p-5">
        {!isConnected && !isConnecting && (
          <ConnectionPanel
            isConnecting={isConnecting}
            isSettingsLoading={isSettingsLoading}
            daPath={daPath}
            onConnect={handleConnect}
          />
        )}

        {(isConnected || isConnecting) && (
          <PartitionSection
            isConnected={isConnected}
            isConnecting={isConnecting}
            isBackupRunning={isBackupRunning}
            partitions={partitions}
            selectedPartitions={selectedPartitions}
            outputPath={defaultOutputPath}
            onToggleSelected={handleToggleSelected}
            onSelectAllSelected={handleSelectAllSelected}
            onSelectOutput={handleSelectOutput}
            onClearOutput={handleClearOutput}
            onFastBackup={handleFastBackup}
            onBackupSelected={handleBackupSelected}
            onRead={handleRead}
            onWrite={handleWrite}
            onFormat={handleFormat}
            onErase={handleErase}
          />
        )}
      </main>

      <OperationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        partition={modalState.partition}
        operation={modalState.operation}
      />
    </div>
  );
}
