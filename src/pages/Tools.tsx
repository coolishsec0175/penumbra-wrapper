import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { FastbootStatus, FastbootStatusEvent } from '../types';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useConfirmation } from '../hooks/useConfirmation';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { PartitionApi } from '../services/api/partitionApi';
import { DeviceApi } from '../services/api/deviceApi';
import { FastbootApi } from '../services/api/fastbootApi';
import { AdvancedApi } from '../services/api/advancedApi';
import { executeOperation } from '../services/operations/executeOperation';
import { ConnectionWarning } from '../components/tools/ConnectionWarning';
import { ReadAllSection } from '../components/tools/ReadAllSection';
import { RestoreSection } from '../components/tools/RestoreSection';
import { BootloaderSection } from '../components/tools/BootloaderSection';
import { FastbootSection } from '../components/tools/FastbootSection';
import { WindowsDiagnosticsPanel } from '../components/WindowsDiagnosticsPanel';
import { PageTransition } from '../components/ui/PageTransition';

export function Tools() {
  const { daPath, preloaderPath, isConnected, isSettingsLoading, isSettingsLoaded } = useDeviceStore();
  const { backupSkipPartitions, setBackupSkipPartitions } = useDeviceStore();
  const { partitions } = usePartitionStore();
  const { addLog } = useOperationStore();
  const { confirm } = useConfirmation();
  const { selectFile } = useFileSelection();

  const [isReadAllRunning, setIsReadAllRunning] = useState(false);
  const [isRestoreRunning, setIsRestoreRunning] = useState(false);
  const [restoreDir, setRestoreDir] = useState<string | null>(null);
  const [isSeccfgRunning, setIsSeccfgRunning] = useState(false);
  const [isFastbootRunning, setIsFastbootRunning] = useState(false);
  const [fastbootStatus, setFastbootStatus] = useState<FastbootStatus | null>(null);
  const [fastbootMessage, setFastbootMessage] = useState('');
  const [skipPartitions, setSkipPartitions] = useState<Set<string>>(new Set());
  const [isSlotRunning, setIsSlotRunning] = useState(false);
  const [isCrashRunning, setIsCrashRunning] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let isMounted = true;

    const setup = async () => {
      unlisten = await listen<FastbootStatusEvent>('fastboot:status', (event) => {
        if (!isMounted) return;
        setFastbootStatus(event.payload.status);
        setFastbootMessage(event.payload.message);
      });
    };

    setup();

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (!isSettingsLoaded) return;
    if (skipPartitions.size === 0 && backupSkipPartitions.length > 0) {
      setSkipPartitions(new Set(backupSkipPartitions));
    }
  }, [isSettingsLoaded, backupSkipPartitions, skipPartitions.size, setSkipPartitions]);

  useEffect(() => {
    if (!isSettingsLoaded) return;
    setBackupSkipPartitions(Array.from(skipPartitions));
  }, [skipPartitions, isSettingsLoaded, setBackupSkipPartitions]);

  const handleSelectAllSkip = () => {
    setSkipPartitions(new Set(partitions.map((p) => p.name)));
  };

  const handleClearAllSkip = () => {
    setSkipPartitions(new Set());
  };

  const handleToggleSkip = (partitionName: string) => {
    const next = new Set(skipPartitions);
    if (next.has(partitionName)) {
      next.delete(partitionName);
    } else {
      next.add(partitionName);
    }
    setSkipPartitions(next);
  };

  const handleReadAll = async () => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    const outputDir = await selectFile(DialogType.BACKUP_FOLDER);
    if (!outputDir) return;

    const skipList = Array.from(skipPartitions);
    const backupCount = partitions.length - skipList.length;

    const confirmed = await confirm({
      title: 'Backup All Partitions',
      message: (
        <div>
          <p>This will backup {backupCount} partitions to:</p>
          <p className="mt-2 rounded bg-muted p-2 font-mono text-sm">
            {outputDir}
          </p>
          {skipList.length > 0 && (
            <p className="mt-2 text-muted-foreground">
              Skipping {skipList.length} partitions: {skipList.join(', ')}
            </p>
          )}
          <p className="mt-3">Continue?</p>
        </div>
      ),
      variant: 'info',
      confirmText: 'Backup',
    });

    if (!confirmed) {
      toast('Backup cancelled');
      return;
    }

    setIsReadAllRunning(true);

    try {
      await executeOperation({
        operation: 'Read all partitions',
        type: 'read',
        partitionName: 'all-partitions',
        partitionSize: `${backupCount} partitions`,
        successMessage: `Backup complete! ${backupCount} partitions backed up`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Starting read-all backup (${backupCount} partitions)...`,
          });
        },
        run: (operationId) =>
          PartitionApi.readAll(
            daPath,
            outputDir,
            skipList,
            preloaderPath || undefined,
            operationId
          ),
      });
    } finally {
      setIsReadAllRunning(false);
    }
  };

  const handleSelectRestoreDir = async () => {
    const dir = await selectFile(DialogType.BACKUP_FOLDER);
    if (dir) {
      setRestoreDir(dir);
      toast.success('Backup folder selected');
    }
  };

  const handleClearRestoreDir = () => {
    setRestoreDir(null);
  };

  const handleRestoreAll = async () => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }
    if (!restoreDir) {
      toast.error('Select a backup folder first');
      return;
    }

    const confirmed = await confirm({
      title: 'Restore All Partitions',
      message: (
        <div>
          <p className="mb-2 font-semibold text-error">WARNING: THIS WILL OVERWRITE ALL PARTITIONS</p>
          <p>This will write every image from:</p>
          <p className="mt-2 rounded bg-muted p-2 font-mono text-sm">{restoreDir}</p>
          <p className="mt-3 text-muted-foreground">All current data on matching partitions will be replaced. Continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Restore',
      countdownSeconds: 15,
    });

    if (!confirmed) {
      toast('Restore cancelled');
      return;
    }

    setIsRestoreRunning(true);

    try {
      await executeOperation({
        operation: 'Restore all partitions',
        type: 'write',
        partitionName: 'all-partitions',
        partitionSize: 'restore',
        successMessage: 'Restore complete!',
        errorMessage: 'Failed to restore partitions',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Starting write-all restore...',
          });
        },
        run: (operationId) =>
          PartitionApi.writeAll(daPath, restoreDir, preloaderPath || undefined, operationId),
      });
    } finally {
      setIsRestoreRunning(false);
    }
  };

  const handleSeccfg = async (action: 'unlock' | 'lock') => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    const isUnlock = action === 'unlock';

    const confirmed = await confirm({
      title: isUnlock ? 'Unlock Bootloader' : 'Lock Bootloader',
      message: isUnlock ? (
        <div>
          <p className="mb-2 font-semibold text-error">WARNING: UNLOCKING THE BOOTLOADER</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li>
            <li>Your warranty may be voided</li>
            <li>Security features will be disabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ) : (
        <div>
          <p className="mb-2 font-semibold text-error">WARNING: LOCKING THE BOOTLOADER</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li>
            <li>You will not be able to flash custom ROMs</li>
            <li>Security features will be re-enabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: isUnlock ? 'Unlock' : 'Lock',
      countdownSeconds: 15,
    });

    if (!confirmed) {
      toast('Operation cancelled');
      return;
    }

    setIsSeccfgRunning(true);

    try {
      await executeOperation({
        operation: `Seccfg ${action}`,
        type: 'write',
        partitionName: `seccfg-${action}`,
        partitionSize: 'bootloader',
        successMessage: `Bootloader ${action}ed successfully!`,
        errorMessage: `Failed to ${action} bootloader`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Starting seccfg ${action}...`,
          });
        },
        run: (operationId) =>
          DeviceApi.seccfgOperation(
            daPath,
            action,
            preloaderPath || undefined,
            operationId
          ),
      });
    } finally {
      setIsSeccfgRunning(false);
    }
  };

  const handleForceFastboot = async () => {
    if (isFastbootRunning) return;

    setIsFastbootRunning(true);
    setFastbootStatus('start');
    setFastbootMessage('Starting fastboot attempt...');
    try {
      const result = await FastbootApi.forceFastboot();
      setFastbootStatus(result.status);
      setFastbootMessage(result.message);
      switch (result.status) {
        case 'success':
          toast.success(result.message || 'Device switched to Fastboot mode');
          break;
        case 'cancelled':
          toast('Fastboot attempt cancelled');
          break;
        case 'no_device':
        case 'no_ack':
        case 'open_error':
        case 'error':
          toast.error(result.message || 'Fastboot attempt failed');
          break;
        default:
          break;
      }
    } catch {
      toast.error('Failed to start fastboot attempt');
    } finally {
      setIsFastbootRunning(false);
    }
  };

  const handleCancelFastboot = async () => {
    try {
      await FastbootApi.cancelForceFastboot();
    } catch {
      toast.error('Failed to cancel fastboot attempt');
    }
  };

  const handleSetSlot = async (slot: 'a' | 'b') => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    const confirmed = await confirm({
      title: `Set Slot ${slot.toUpperCase()}`,
      message: `Set the active boot slot to ${slot.toUpperCase()}?`,
      variant: 'warning',
      confirmText: 'Set',
    });

    if (!confirmed) {
      toast('Operation cancelled');
      return;
    }

    setIsSlotRunning(true);

    try {
      await executeOperation({
        operation: `Set active slot ${slot.toUpperCase()}`,
        type: 'write',
        partitionName: `slot-${slot}`,
        partitionSize: 'bootloader',
        successMessage: `Active slot set to ${slot.toUpperCase()} successfully!`,
        errorMessage: `Failed to set active slot to ${slot.toUpperCase()}`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Setting active boot slot to ${slot.toUpperCase()}...`,
          });
        },
        run: (operationId) =>
          AdvancedApi.setActiveSlot(daPath, slot, preloaderPath || undefined, operationId),
      });
    } finally {
      setIsSlotRunning(false);
    }
  };

  const handleCrash = async () => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    const confirmed = await confirm({
      title: 'Send Crash Command',
      message:
        'Send the debug crash command to the antumbra CLI. This will cause the CLI to crash on purpose. Continue?',
      variant: 'danger',
      confirmText: 'Send',
    });

    if (!confirmed) {
      toast('Operation cancelled');
      return;
    }

    setIsCrashRunning(true);

    try {
      await executeOperation({
        operation: 'Send crash command',
        type: 'write',
        partitionName: 'crash',
        partitionSize: 'debug',
        successMessage: 'Crash command sent successfully!',
        errorMessage: 'Failed to send crash command',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Sending crash command to antumbra...',
          });
        },
        run: (operationId) =>
          DeviceApi.crash(daPath, preloaderPath || undefined, operationId),
      });
    } finally {
      setIsCrashRunning(false);
    }
  };

  const backupCount = partitions.length - skipPartitions.size;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-5xl space-y-4">
          {!isConnected && <ConnectionWarning />}

          <ReadAllSection
            isConnected={isConnected}
            isReadAllRunning={isReadAllRunning}
            isSettingsLoading={isSettingsLoading}
            partitions={partitions}
            skipPartitions={skipPartitions}
            backupCount={backupCount}
            onSelectAllSkip={handleSelectAllSkip}
            onClearAllSkip={handleClearAllSkip}
            onToggleSkip={handleToggleSkip}
            onReadAll={handleReadAll}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RestoreSection
              isConnected={isConnected}
              isRestoreRunning={isRestoreRunning}
              isSettingsLoading={isSettingsLoading}
              backupDir={restoreDir}
              onSelectDir={handleSelectRestoreDir}
              onClearDir={handleClearRestoreDir}
              onRestore={handleRestoreAll}
            />

            <FastbootSection
              isRunning={isFastbootRunning}
              status={fastbootStatus}
              statusMessage={fastbootMessage}
              onForceFastboot={handleForceFastboot}
              onCancel={handleCancelFastboot}
            />

            <BootloaderSection
              isConnected={isConnected}
              isSeccfgRunning={isSeccfgRunning}
              isSettingsLoading={isSettingsLoading}
              isSlotRunning={isSlotRunning}
              isCrashRunning={isCrashRunning}
              onUnlock={() => handleSeccfg('unlock')}
              onLock={() => handleSeccfg('lock')}
              onSetSlot={handleSetSlot}
              onCrash={handleCrash}
            />

            <WindowsDiagnosticsPanel />
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
