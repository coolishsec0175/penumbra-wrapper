import { useState } from 'react';
import toast from 'react-hot-toast';
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
import { XflashRscSection } from '../components/tools/XflashRscSection';
import { MemorySection } from '../components/tools/MemorySection';
import { RpmbSection } from '../components/tools/RpmbSection';
import { ReadFlashSection } from '../components/tools/ReadFlashSection';

export function Tools() {
  const { daPath, preloaderPath, isConnected, isSettingsLoading } = useDeviceStore();
  const { partitions } = usePartitionStore();
  const { addLog } = useOperationStore();
  const { confirm } = useConfirmation();
  const { selectFile } = useFileSelection();

  const [isReadAllRunning, setIsReadAllRunning] = useState(false);
  const [isRestoreRunning, setIsRestoreRunning] = useState(false);
  const [restoreDir, setRestoreDir] = useState<string | null>(null);
  const [isSeccfgRunning, setIsSeccfgRunning] = useState(false);
  const [isFastbootRunning, setIsFastbootRunning] = useState(false);
  const [isRscRunning, setIsRscRunning] = useState(false);
  const [rscPartition, setRscPartition] = useState('');
  const [rscImage, setRscImage] = useState<string | null>(null);
  const [skipPartitions, setSkipPartitions] = useState<Set<string>>(new Set());
  const [isSlotRunning, setIsSlotRunning] = useState(false);
  const [isCrashRunning, setIsCrashRunning] = useState(false);
  const [isMemoryRunning, setIsMemoryRunning] = useState(false);
  const [isRpmbRunning, setIsRpmbRunning] = useState(false);
  const [isReadFlashRunning, setIsReadFlashRunning] = useState(false);

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
          <p className="font-mono text-sm bg-surface-alt p-2 rounded mt-2">
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
      toast('Backup cancelled', { icon: 'ℹ️' });
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
          <p className="font-semibold text-danger mb-2">WARNING: THIS WILL OVERWRITE ALL PARTITIONS</p>
          <p>This will write every image from:</p>
          <p className="font-mono text-sm bg-surface-alt p-2 rounded mt-2">{restoreDir}</p>
          <p className="mt-3 text-muted-foreground">All current data on matching partitions will be replaced. Continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Restore',
    });

    if (!confirmed) {
      toast('Restore cancelled', { icon: 'ℹ️' });
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
      title: isUnlock ? '⚠️ Unlock Bootloader' : '⚠️ Lock Bootloader',
      message: isUnlock ? (
        <div>
          <p className="font-semibold text-danger mb-2">WARNING: UNLOCKING THE BOOTLOADER</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li>
            <li>Your warranty may be voided</li>
            <li>Security features will be disabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ) : (
        <div>
          <p className="font-semibold text-danger mb-2">WARNING: LOCKING THE BOOTLOADER</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li>
            <li>You will not be able to flash custom ROMs</li>
            <li>Security features will be re-enabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: isUnlock ? 'Unlock' : 'Lock',
    });

    if (!confirmed) {
      toast('Operation cancelled', { icon: 'ℹ️' });
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
    try {
      await FastbootApi.forceFastboot();
    } catch {
      toast.error('Failed to start fastboot attempt');
    } finally {
      setIsFastbootRunning(false);
    }
  };

  const handleSelectRscImage = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE);
    if (path) {
      setRscImage(path);
      toast.success('Image file selected');
    }
  };

  const handleClearRscImage = () => {
    setRscImage(null);
  };

  const handleRscFlash = async () => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }
    if (!rscPartition.trim() || !rscImage) {
      toast.error('Select a partition and image file first');
      return;
    }

    const partition = rscPartition.trim();

    const confirmed = await confirm({
      title: 'Flash RSC Partition',
      message: (
        <div>
          <p className="font-semibold text-danger mb-2">WARNING: THIS WILL OVERWRITE THE PARTITION</p>
          <p>This will flash partition:</p>
          <p className="font-mono text-sm bg-surface-alt p-2 rounded mt-2">{partition}</p>
          <p className="mt-3 text-muted-foreground">with image:</p>
          <p className="font-mono text-sm bg-surface-alt p-2 rounded mt-2">{rscImage}</p>
          <p className="mt-3 text-muted-foreground">using the XFlash V5 RSC protocol. Continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Flash',
    });

    if (!confirmed) {
      toast('Flash cancelled', { icon: 'ℹ️' });
      return;
    }

    setIsRscRunning(true);

    try {
      await executeOperation({
        operation: 'Flash RSC partition',
        type: 'write',
        partitionName: partition,
        successMessage: `RSC flash of '${partition}' complete!`,
        errorMessage: `Failed to flash '${partition}'`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Starting XFlash V5 RSC flash of '${partition}'...`,
          });
        },
        run: (operationId) =>
          PartitionApi.rscFlash(
            daPath,
            partition,
            rscImage,
            preloaderPath || undefined,
            operationId
          ),
      });
    } finally {
      setIsRscRunning(false);
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
      toast('Operation cancelled', { icon: 'ℹ️' });
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
      toast('Operation cancelled', { icon: 'ℹ️' });
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

  const handleMemoryRead = async (address: string, length: string, outputPath: string) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    setIsMemoryRunning(true);

    try {
      await executeOperation({
        operation: 'Peek memory',
        type: 'read',
        partitionName: `memory@${address}`,
        partitionSize: length,
        successMessage: 'Memory read complete!',
        errorMessage: 'Failed to read memory',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Reading ${length} bytes from memory address ${address}...`,
          });
        },
        run: (operationId) =>
          AdvancedApi.peek({
            daPath,
            address,
            length,
            filePath: outputPath,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
    } finally {
      setIsMemoryRunning(false);
    }
  };

  const handleMemoryWrite = async (address: string, filePath: string) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    setIsMemoryRunning(true);

    try {
      await executeOperation({
        operation: 'Poke memory',
        type: 'write',
        partitionName: `memory@${address}`,
        partitionSize: 'memory',
        successMessage: 'Memory write complete!',
        errorMessage: 'Failed to write memory',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Writing file to memory address ${address}...`,
          });
        },
        run: (operationId) =>
          AdvancedApi.poke({
            daPath,
            address,
            filePath,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
    } finally {
      setIsMemoryRunning(false);
    }
  };

  const handleRpmbRead = async (options: {
    filePath: string;
    region?: number;
    startSector?: number;
    numSectors?: number;
  }) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    setIsRpmbRunning(true);

    try {
      await executeOperation({
        operation: 'RPMB read',
        type: 'read',
        partitionName: 'rpmb',
        partitionSize: options.numSectors ? `${options.numSectors} sectors` : undefined,
        successMessage: 'RPMB read complete!',
        errorMessage: 'Failed to read RPMB',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Reading RPMB partition...',
          });
        },
        run: (operationId) =>
          AdvancedApi.rpmbRead({
            daPath,
            filePath: options.filePath,
            region: options.region,
            startSector: options.startSector,
            numSectors: options.numSectors,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
    } finally {
      setIsRpmbRunning(false);
    }
  };

  const handleRpmbWrite = async (options: {
    filePath: string;
    region?: number;
    startSector?: number;
    numSectors?: number;
  }) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    setIsRpmbRunning(true);

    try {
      await executeOperation({
        operation: 'RPMB write',
        type: 'write',
        partitionName: 'rpmb',
        partitionSize: options.numSectors ? `${options.numSectors} sectors` : undefined,
        successMessage: 'RPMB write complete!',
        errorMessage: 'Failed to write RPMB',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Writing RPMB partition...',
          });
        },
        run: (operationId) =>
          AdvancedApi.rpmbWrite({
            daPath,
            filePath: options.filePath,
            region: options.region,
            startSector: options.startSector,
            numSectors: options.numSectors,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
    } finally {
      setIsRpmbRunning(false);
    }
  };

  const handleRpmbAuth = async (key: string, region?: number) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    setIsRpmbRunning(true);

    try {
      await executeOperation({
        operation: 'RPMB auth',
        type: 'write',
        partitionName: 'rpmb',
        partitionSize: 'auth',
        successMessage: 'RPMB authentication successful!',
        errorMessage: 'Failed to authenticate RPMB',
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Authenticating with RPMB partition...',
          });
        },
        run: (operationId) =>
          AdvancedApi.rpmbAuth({
            daPath,
            key,
            region,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
    } finally {
      setIsRpmbRunning(false);
    }
  };

  const handleReadFlash = async (partition: string, outputPath: string) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    setIsReadFlashRunning(true);

    try {
      await executeOperation({
        operation: 'Read flash partition',
        type: 'read',
        partitionName: partition,
        successMessage: `Read of '${partition}' complete!`,
        errorMessage: `Failed to read '${partition}'`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Reading flash partition '${partition}'...`,
          });
        },
        run: (operationId) =>
          PartitionApi.readFlash(daPath, partition, outputPath, preloaderPath || undefined, operationId),
      });
    } finally {
      setIsReadFlashRunning(false);
    }
  };

  const handleWriteFlash = async (partition: string, imagePath: string) => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    const confirmed = await confirm({
      title: 'Write Flash Partition',
      message: (
        <div>
          <p className="font-semibold text-danger mb-2">WARNING: THIS WILL OVERWRITE THE PARTITION</p>
          <p>This will write to partition:</p>
          <p className="font-mono text-sm bg-surface-alt p-2 rounded mt-2">{partition}</p>
          <p className="mt-3 text-muted-foreground">with image:</p>
          <p className="font-mono text-sm bg-surface-alt p-2 rounded mt-2">{imagePath}</p>
          <p className="mt-3 text-muted-foreground">Continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Write',
    });

    if (!confirmed) {
      toast('Write cancelled', { icon: 'ℹ️' });
      return;
    }

    setIsReadFlashRunning(true);

    try {
      await executeOperation({
        operation: 'Write flash partition',
        type: 'write',
        partitionName: partition,
        successMessage: `Write to '${partition}' complete!`,
        errorMessage: `Failed to write '${partition}'`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Writing flash partition '${partition}'...`,
          });
        },
        run: (operationId) =>
          PartitionApi.writeFlash(daPath, partition, imagePath, preloaderPath || undefined, operationId),
      });
    } finally {
      setIsReadFlashRunning(false);
    }
  };

  const backupCount = partitions.length - skipPartitions.size;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 space-y-4 overflow-y-auto p-4">
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

        <RestoreSection
          isConnected={isConnected}
          isRestoreRunning={isRestoreRunning}
          isSettingsLoading={isSettingsLoading}
          backupDir={restoreDir}
          onSelectDir={handleSelectRestoreDir}
          onClearDir={handleClearRestoreDir}
          onRestore={handleRestoreAll}
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

        <FastbootSection
          isRunning={isFastbootRunning}
          onForceFastboot={handleForceFastboot}
        />

        <XflashRscSection
          isConnected={isConnected}
          isRscRunning={isRscRunning}
          isSettingsLoading={isSettingsLoading}
          partitionName={rscPartition}
          imagePath={rscImage}
          onPartitionNameChange={setRscPartition}
          onSelectImage={handleSelectRscImage}
          onClearImage={handleClearRscImage}
          onFlash={handleRscFlash}
        />

        <ReadFlashSection
          isConnected={isConnected}
          isRunning={isReadFlashRunning}
          isSettingsLoading={isSettingsLoading}
          onRead={handleReadFlash}
          onWrite={handleWriteFlash}
        />

        <MemorySection
          isConnected={isConnected}
          isRunning={isMemoryRunning}
          isSettingsLoading={isSettingsLoading}
          onRead={handleMemoryRead}
          onWrite={handleMemoryWrite}
        />

        <RpmbSection
          isConnected={isConnected}
          isRunning={isRpmbRunning}
          isSettingsLoading={isSettingsLoading}
          onRead={handleRpmbRead}
          onWrite={handleRpmbWrite}
          onAuth={handleRpmbAuth}
        />
      </main>
    </div>
  );
}
