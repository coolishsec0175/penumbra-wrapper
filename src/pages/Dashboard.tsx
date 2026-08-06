import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, X } from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useUIStore } from '../store/uiStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { usePartitionOperations } from '../hooks/usePartitionOperations';
import { useFileSelection } from '../hooks/useFileSelection';
import { WelcomeScreen } from '../components/dashboard/WelcomeScreen';
import { OperationModal } from '../components/OperationModal';
import { PartitionSkeleton } from '../components/PartitionSkeleton';
import { PartitionTable } from '../components/PartitionTable';
import { ProgressWidget } from '../components/ProgressWidget';
import { Panel } from '../components/penumbra/Panel';
import { StatusCard } from '../components/penumbra/StatusCard';
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
  const {
    daPath,
    preloaderPath,
    defaultOutputPath,
    isSettingsLoading,
    setDaPath,
    setPreloaderPath,
    setDefaultOutputPath,
  } = useDeviceStore();

  const { partitions } = usePartitionStore();
  const { addLog, clearLogs } = useOperationStore();
  const isOperationRunning = useOperationStore((state) => state.isRunning);
  const operationType = useOperationStore((state) => state.type);
  const operationPartition = useOperationStore((state) => state.partitionName);
  const operationSize = useOperationStore((state) => state.partitionSize);
  const operationStart = useOperationStore((state) => state.startTime);

  const { connect, isConnected, isConnecting } = useDeviceConnection();
  const { formatPartition, erasePartition } = usePartitionOperations();
  const { selectFile } = useFileSelection();
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const openLogPanel = useUIStore((state) => state.openLogPanel);

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

  const handleSelectDa = async () => {
    const path = await selectFile(DialogType.DA_FILE);
    if (path) {
      await setDaPath(path);
      toast.success('DA file selected');
    }
  };

  const handleSelectPreloader = async () => {
    const path = await selectFile(DialogType.PRELOADER_FILE);
    if (path) {
      await setPreloaderPath(path);
      toast.success('Preloader selected');
    }
  };

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
      <main className="flex min-h-0 flex-1 flex-col p-5">
        <div className="min-h-0 flex-1 overflow-hidden">
          {!isConnected && !isConnecting && (
            <WelcomeScreen
              isConnecting={isConnecting}
              isSettingsLoading={isSettingsLoading}
              onSelectDa={handleSelectDa}
              onSelectPreloader={handleSelectPreloader}
              onConnect={handleConnect}
              onNavigate={navigate}
            />
          )}

          {(isConnected || isConnecting) && (
            <div className="flex h-full gap-4">
            {/* ACTIONS panel */}
            <div className="flex w-72 shrink-0 flex-col gap-4">
              <Panel title="ACTIONS" accent>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleFastBackup}
                    disabled={!isConnected || isConnecting || isBackupRunning}
                    className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                  >
                    <span className="text-accent">⚡</span>
                    <span className="flex-1">
                      {isBackupRunning ? 'Backing up...' : 'Backup NVRAM'}
                    </span>
                  </button>
                  <button
                    onClick={handleBackupSelected}
                    disabled={
                      !isConnected ||
                      isConnecting ||
                      isBackupRunning ||
                      selectedPartitions.size === 0
                    }
                    className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                  >
                    <span className="text-accent">📦</span>
                    <span className="flex-1">
                      {isBackupRunning
                        ? 'Backing up...'
                        : `Backup Selected (${selectedPartitions.size})`}
                    </span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={handleSelectOutput}
                    disabled={isBackupRunning}
                    className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {defaultOutputPath
                        ? getBasename(defaultOutputPath)
                        : 'Select Output Folder'}
                    </span>
                    {defaultOutputPath && !isBackupRunning && (
                      <X
                        className="h-3.5 w-3.5 shrink-0 text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleClearOutput();
                        }}
                      />
                    )}
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => navigate('/tools')}
                    className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                  >
                    <span className="text-accent">🔧</span>
                    <span className="flex-1">Tools & Bootloader</span>
                  </button>
                  <button
                    onClick={() => navigate('/flasher')}
                    className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                  >
                    <span className="text-accent">▤</span>
                    <span className="flex-1">Scatter Flasher</span>
                  </button>
                </div>
              </Panel>

              <Panel title="STATUS">
                <div className="flex flex-col gap-2">
                  <StatusCard
                    label="DA"
                    value={daPath ? getBasename(daPath) : 'Not selected'}
                    icon={<span className="text-accent">☽</span>}
                  />
                  <StatusCard
                    label="PL"
                    value={preloaderPath ? getBasename(preloaderPath) : 'Not selected'}
                    icon={<span className="text-accent">⚡</span>}
                  />
                </div>
              </Panel>
            </div>

            {/* DEVICE INFO panel */}
            <div className="min-w-0 flex-1">
              <Panel title="DEVICE INFO" accent padded={false} className="h-full">
                {isConnecting ? (
                  <PartitionSkeleton />
                ) : (
                  <PartitionTable
                    partitions={partitions}
                    selectedPartitions={selectedPartitions}
                    onToggleSelected={handleToggleSelected}
                    onSelectAllSelected={handleSelectAllSelected}
                    onRead={handleRead}
                    onWrite={handleWrite}
                    onFormat={handleFormat}
                    onErase={handleErase}
                  />
                )}
              </Panel>
            </div>
          </div>
        )}
        </div>

        <ProgressWidget
          isActive={isOperationRunning}
          operationType={operationType}
          partitionName={operationPartition}
          partitionSize={operationSize || undefined}
          startTime={operationStart}
        />
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
