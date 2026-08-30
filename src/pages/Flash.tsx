import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { FolderOpen, Package, X, Zap, Loader2 } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useFlasherStore } from '../store/flasherStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { useFileSelection } from '../hooks/useFileSelection';
import { useConfirmation } from '../hooks/useConfirmation';
import { usePartitionOperations } from '../hooks/usePartitionOperations';
import { DialogType } from '../services/dialogs/fileDialogService';
import { PartitionApi } from '../services/api/partitionApi';
import { DeviceApi } from '../services/api/deviceApi';
import { AdvancedApi } from '../services/api/advancedApi';
import { ScatterApi } from '../services/api/scatterApi';
import { executeOperation } from '../services/operations/executeOperation';
import { generateTimestampedFilename, joinPath, getBasename } from '../services/utils/pathUtils';
import { ErrorHandler } from '../services/utils/errorHandler';
import { formatHexSize } from '../services/utils/formatUtils';
import { findScatterInFolder } from '../services/utils/scatterFolder';
import { OperationModal } from '../components/OperationModal';
import { PartitionTable } from '../components/PartitionTable';
import { ProgressWidget } from '../components/ProgressWidget';
import { ScatterDropzone } from '../components/flasher/ScatterDropzone';
import { ScatterInfoBar } from '../components/flasher/ScatterInfoBar';
import { FlashPartitionTable } from '../components/flasher/FlashPartitionTable';
import { FlashActionBar } from '../components/flasher/FlashActionBar';
import { FlashProgressModal } from '../components/flasher/FlashProgressModal';
import { OutputLogPanel } from '../components/flasher/OutputLogPanel';
import { ReadAllSection } from '../components/tools/ReadAllSection';
import { RestoreSection } from '../components/tools/RestoreSection';
import { BootloaderSection } from '../components/tools/BootloaderSection';
import { FastbootSection } from '../components/tools/FastbootSection';
import { BootPlSection } from '../components/tools/BootPlSection';
import { ConnectionWarning } from '../components/tools/ConnectionWarning';
import { Tabs } from '../components/ui/Tabs';
import { PageTransition } from '../components/ui/PageTransition';
import { Panel } from '../components/penumbra/Panel';
import { StatusCard } from '../components/penumbra/StatusCard';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import type { Partition, FastbootStatus, FastbootStatusEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from '@tauri-apps/plugin-fs';

const FLASH_TABS = [
  { id: 'partitions', label: 'Partitions' },
  { id: 'scatter', label: 'Scatter Flash' },
  { id: 'backup', label: 'Backup & Restore' },
  { id: 'advanced', label: 'Advanced' },
] as const;

const CRITICAL_PARTITIONS = ['nvram', 'nvdata', 'nvcfg', 'proinfo', 'protect1', 'protect2'];

export function Flash() {
  const { daPath, preloaderPath, defaultOutputPath, setDefaultOutputPath } = useDeviceStore();
  const { backupSkipPartitions, setBackupSkipPartitions, isConnected: isSettingsLoaded } = useDeviceStore();
  const { partitions } = usePartitionStore();
  const { addLog, clearLogs } = useOperationStore();
  const isOperationRunning = useOperationStore((state) => state.isRunning);
  const operationType = useOperationStore((state) => state.type);
  const operationPartition = useOperationStore((state) => state.partitionName);
  const operationSize = useOperationStore((state) => state.partitionSize);
  const operationStart = useOperationStore((state) => state.startTime);

  const { isConnected, isConnecting } = useDeviceConnection();
  const { selectFile } = useFileSelection();
  const { confirm } = useConfirmation();
  const { formatPartition, erasePartition } = usePartitionOperations();

  const [activeTab, setActiveTab] = useState('partitions');

  // ── Partitions tab state ──
  const [selectedPartitions, setSelectedPartitions] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    partition: Partition | null;
    operation: 'read' | 'write';
  }>({ isOpen: false, partition: null, operation: 'read' });

  // ── Scatter tab state ──
  const {
    scatterFile, isLoadingScatter, selectedPartitions: scatterSelected,
    partitionImages, isFlashing, currentFlashIndex, totalFlashCount,
    flashModalMinimized, showFlashModal, setScatterFile, setLoadingScatter,
    setSelectedPartitions: setScatterSelected, setPartitionImages, setFlashing,
    updateFlashProgress, setFlashModalMinimized, setFlashModalOpen,
    togglePartitionSelection,
  } = useFlasherStore();
  const [scatterError, setScatterError] = useState<string | null>(null);

  // ── Backup tab state ──
  const [isReadAllRunning, setIsReadAllRunning] = useState(false);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [isRestoreRunning, setIsRestoreRunning] = useState(false);
  const [restoreDir, setRestoreDir] = useState<string | null>(null);
  const [skipPartitions, setSkipPartitions] = useState<Set<string>>(new Set());

  // ── Advanced tab state ──
  const [isSeccfgRunning, setIsSeccfgRunning] = useState(false);
  const [isFastbootRunning, setIsFastbootRunning] = useState(false);
  const [fastbootStatus, setFastbootStatus] = useState<FastbootStatus | null>(null);
  const [fastbootMessage, setFastbootMessage] = useState('');
  const [isSlotRunning, setIsSlotRunning] = useState(false);
  const [isCrashRunning, setIsCrashRunning] = useState(false);
  const [isBootPlRunning, setIsBootPlRunning] = useState(false);
  const [bootPlFile, setBootPlFile] = useState<string | null>(null);
  const [isReadEfusesRunning, setIsReadEfusesRunning] = useState(false);

  // ── Fastboot status listener ──
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
    return () => { isMounted = false; if (unlisten) unlisten(); };
  }, []);

  // ── Backup skip sync ──
  useEffect(() => {
    if (!isSettingsLoaded) return;
    if (skipPartitions.size === 0 && backupSkipPartitions.length > 0) {
      setSkipPartitions(new Set(backupSkipPartitions));
    }
  }, [isSettingsLoaded, backupSkipPartitions, skipPartitions.size]);

  useEffect(() => {
    if (!isSettingsLoaded) return;
    setBackupSkipPartitions(Array.from(skipPartitions));
  }, [skipPartitions, isSettingsLoaded]);

  // ═══════════════════════════════════════════
  // PARTITIONS TAB handlers
  // ═══════════════════════════════════════════

  const handleSelectOutput = async () => {
    const path = await selectFile(DialogType.OUTPUT_FOLDER);
    if (path) { await setDefaultOutputPath(path); toast.success('Default output folder selected'); }
  };

  const handleClearOutput = async () => { await setDefaultOutputPath(null); toast.success('Default output folder cleared'); };

  const backupPartitions = async (targets: Partition[], backupLabel: string) => {
    if (!daPath || !isConnected) return;
    if (!defaultOutputPath) { toast.error('Please set a default output path first'); return; }
    if (targets.length === 0) { toast.error('No partitions selected'); return; }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputDir = joinPath(defaultOutputPath, `${backupLabel}-${timestamp}`);

    const confirmed = await confirm({
      title: `Backup ${backupLabel}`,
      message: `This will backup ${targets.length} partition(s) (${targets.map((p) => p.name).join(', ')}) to your default output folder under ${getBasename(outputDir)}.\n\nContinue?`,
      variant: 'info', confirmText: 'Backup',
    });
    if (!confirmed) { toast('Backup cancelled'); return; }

    clearLogs();
    setIsBackupRunning(true);
    try { await mkdir(outputDir, { recursive: true }); }
    catch (error: unknown) { setIsBackupRunning(false); ErrorHandler.handle(error, `Create ${backupLabel} backup folder`); return; }

    addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Starting backup for ${targets.length} partitions...` });

    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < targets.length; i++) {
      const partition = targets[i];
      const filename = generateTimestampedFilename(partition.name, 'img');
      const outputPath = joinPath(outputDir, filename);
      const operationId = uuidv4();
      const result = await executeOperation({
        operation: `Backup ${partition.name}`, type: 'read', partitionName: partition.name,
        partitionSize: partition.display_size, operationId, clearLogs: false, handleSuccess: false,
        errorOptions: { showToast: false },
        run: (opId) => PartitionApi.read({ daPath, partition: partition.name, outputPath, preloaderPath: preloaderPath || undefined, operationId: opId }),
      });
      if (!result.success) { failCount++; toast.error(`${partition.name} failed`); continue; }
      successCount++;
      toast.success(`${partition.name} (${i + 1}/${targets.length})`);
    }
    if (failCount === 0) toast.success(`Backup complete! ${successCount} partitions backed up`);
    else toast(`Backup complete: ${successCount} succeeded, ${failCount} failed`);
    setIsBackupRunning(false);
  };

  const handleFastBackup = () => {
    const availablePartitions = partitions.filter((p) => CRITICAL_PARTITIONS.includes(p.name.toLowerCase()));
    void backupPartitions(availablePartitions, 'NVRAM');
  };

  const handleBackupSelected = () => {
    const targets = partitions.filter((p) => selectedPartitions.has(p.name));
    void backupPartitions(targets, 'Backup');
  };

  const handleToggleSelected = useCallback((name: string) => {
    setSelectedPartitions((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });
  }, []);

  const handleSelectAllSelected = useCallback((checked: boolean) => {
    setSelectedPartitions(checked ? new Set(partitions.map((p) => p.name)) : new Set());
  }, [partitions]);

  const handleRead = (partition: Partition) => setModalState({ isOpen: true, partition, operation: 'read' });
  const handleWrite = (partition: Partition) => setModalState({ isOpen: true, partition, operation: 'write' });

  const handleFormat = async (partition: Partition) => {
    const confirmed = await confirm({ title: 'Format Partition', message: `This will FORMAT the "${partition.name}" partition.\n\nAll data will be permanently erased!\n\nContinue?`, variant: 'danger', confirmText: 'Format', countdownSeconds: 15 });
    if (!confirmed) { toast('Format cancelled'); return; }
    await formatPartition(partition);
  };

  const handleErase = async (partition: Partition) => {
    const confirmed = await confirm({ title: 'Erase Partition', message: `This will ERASE the "${partition.name}" partition.\n\nAll data will be permanently deleted!\n\nContinue?`, variant: 'danger', confirmText: 'Erase', countdownSeconds: 15 });
    if (!confirmed) { toast('Erase cancelled'); return; }
    await erasePartition(partition);
  };

  // ═══════════════════════════════════════════
  // SCATTER TAB handlers
  // ═══════════════════════════════════════════

  const loadScatterPath = async (path: string) => {
    setLoadingScatter(true);
    setScatterError(null);
    setScatterSelected(new Set());
    setPartitionImages(new Map());
    try {
      const parsed = await ScatterApi.parseScatterFile(path);
      setScatterFile(parsed);
      const detectedImages = await ScatterApi.detectImageFiles(path, parsed.partitions);
      for (const [name, image] of detectedImages) {
        if (name.endsWith('_a')) { const bName = name.slice(0, -2) + '_b'; if (!detectedImages.has(bName)) detectedImages.set(bName, image); }
      }
      setPartitionImages(detectedImages);
      const partitionsWithImages = new Set(parsed.partitions.filter((p) => p.is_download && detectedImages.has(p.partition_name)).map((p) => p.partition_name));
      setScatterSelected(partitionsWithImages);
      const downloadableCount = parsed.partitions.filter((p) => p.is_download).length;
      toast.success(`Loaded ${downloadableCount} partitions from ${parsed.platform}`);
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Parse scatter file', { customMessage: 'Failed to parse scatter file' });
      setScatterFile(null);
      setScatterError('Failed to parse scatter file. Make sure it is a valid MediaTek scatter layout.');
    } finally { setLoadingScatter(false); }
  };

  const handleSelectScatterFile = async () => {
    const selected = await selectFile(DialogType.SCATTER_FILE, undefined, { title: 'Select Scatter File' });
    if (selected) await loadScatterPath(selected as string);
  };

  const handleSelectScatterFolder = async () => {
    const selected = await selectFile(DialogType.BACKUP_FOLDER, undefined, { title: 'Select Firmware Folder' });
    if (selected) {
      const scatter = await findScatterInFolder(selected as string);
      if (!scatter) { toast.error('No scatter file found in the selected folder'); return; }
      await loadScatterPath(scatter);
    }
  };

  const handleToggleScatterPartition = (partitionName: string) => togglePartitionSelection(partitionName);

  const handleSelectImage = async (partitionName: string) => {
    const selected = await selectFile(DialogType.IMAGE_FILE, undefined, { title: `Select Image for ${partitionName}`, filters: [{ name: 'Image Files', extensions: ['img', 'bin'] }, { name: 'All Files', extensions: ['*'] }] });
    if (selected) {
      const next = new Map(partitionImages); next.set(partitionName, selected as string); setPartitionImages(next);
      const nextSelected = new Set(scatterSelected); nextSelected.add(partitionName); setScatterSelected(nextSelected);
      toast.success(`Image selected for ${partitionName}`);
    }
  };

  const handleSelectAllScatter = () => {
    if (!scatterFile) return;
    const partitionsWithImages = new Set(scatterFile.partitions.filter((p) => p.is_download && partitionImages.has(p.partition_name)).map((p) => p.partition_name));
    setScatterSelected(partitionsWithImages);
  };

  const handleClearAllScatter = () => setScatterSelected(new Set());
  const handleClearScatter = () => { setScatterFile(null); setScatterError(null); };

  const selectedFlashOrder = (scatterFile?.partitions ?? [])
    .filter((partition) => scatterSelected.has(partition.partition_name))
    .map((partition) => partition.partition_name);

  const currentFlashingPartition = selectedFlashOrder.length > 0 && currentFlashIndex > 0
    ? selectedFlashOrder[currentFlashIndex - 1] || '' : '';

  const downloadPartitions = scatterFile?.partitions.filter((p) => p.is_download) || [];
  const selectedCount = scatterSelected.size;
  const selectedWithImagesCount = Array.from(scatterSelected).filter((name) => partitionImages.has(name)).length;
  const missingImagesCount = selectedCount - selectedWithImagesCount;
  const canFlash = selectedCount > 0 && missingImagesCount === 0 && isConnected && !!daPath;

  const handleFlash = async () => {
    if (!daPath || !canFlash || !scatterFile || isFlashing) {
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
          <p className="font-semibold text-error">READ THIS BEFORE PROCEEDING</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Scatter flashing writes many partitions in a single run. If the scatter targets the wrong chip, project, or storage type, the device will be <span className="font-semibold">BRICKED</span>.</li>
            <li>Confirm the scatter's platform ({scatterFile.platform}) matches the connected chip.</li>
            <li>Keep the device on a reliable USB cable with enough charge; an interrupted scatter flash almost always bricks.</li>
          </ul>
          <p>The following <span className="font-semibold">{selectedCount}</span> partition(s) will be overwritten: {selectedFlashOrder.join(', ')}.</p>
          <p>Do you want to continue?</p>
        </div>
      ),
      variant: 'danger', confirmText: 'Flash', countdownSeconds: 15,
    });
    if (!confirmed) { toast('Flash cancelled'); return; }

    const selectedNames = selectedFlashOrder;
    const total = selectedNames.length;
    const cancelRef = { current: false };
    setFlashing(true, 0, total);
    setFlashModalOpen(true);

    let successCount = 0;
    let failed = false;
    let failedPartitionName = '';

    for (let i = 0; i < selectedNames.length; i++) {
      if (cancelRef.current) { toast(`Flash cancelled after ${successCount} partition(s)`); break; }
      const partitionName = selectedNames[i];
      const imagePath = partitionImages.get(partitionName);
      if (!imagePath) continue;
      updateFlashProgress(i + 1);
      const partition = scatterFile.partitions.find((p) => p.partition_name === partitionName);
      if (!partition) continue;
      const result = await executeOperation({
        operation: `Flash ${partition.partition_name}`, type: 'write', partitionName: partition.partition_name,
        partitionSize: formatHexSize(partition.partition_size),
        run: (opId) => PartitionApi.write({ daPath, partition: partition.partition_name, imagePath, preloaderPath: preloaderPath || undefined, operationId: opId }),
      });
      if (!result.success) { failed = true; failedPartitionName = partitionName; break; }
      successCount++;
    }

    setFlashing(false);
    setFlashModalOpen(false);

    if (cancelRef.current) toast(`Flash cancelled after ${successCount} partition(s)`);
    else if (failed) toast.error(`Flash failed at partition ${failedPartitionName || 'unknown'}`);
    else toast.success(`Successfully flashed ${successCount} partition(s)`);
  };

  const handleFlashModalClose = () => { setFlashModalOpen(false); };
  const handleFlashModalMinimize = () => { setFlashModalOpen(false); setFlashModalMinimized(true); };

  // ═══════════════════════════════════════════
  // BACKUP & RESTORE TAB handlers
  // ═══════════════════════════════════════════

  const handleSelectAllSkip = () => setSkipPartitions(new Set(partitions.map((p) => p.name)));
  const handleClearAllSkip = () => setSkipPartitions(new Set());
  const handleToggleSkip = (partitionName: string) => {
    const next = new Set(skipPartitions);
    if (next.has(partitionName)) next.delete(partitionName); else next.add(partitionName);
    setSkipPartitions(next);
  };

  const handleReadAll = async () => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    const outputDir = await selectFile(DialogType.BACKUP_FOLDER);
    if (!outputDir) return;
    const skipList = Array.from(skipPartitions);
    const backupCount = partitions.length - skipList.length;
    const confirmed = await confirm({
      title: 'Backup All Partitions',
      message: (
        <div>
          <p>This will backup {backupCount} partitions to:</p>
          <p className="mt-2 rounded bg-muted p-2 font-mono text-sm">{outputDir}</p>
          {skipList.length > 0 && <p className="mt-2 text-muted-foreground">Skipping {skipList.length} partitions: {skipList.join(', ')}</p>}
          <p className="mt-3">Continue?</p>
        </div>
      ),
      variant: 'info', confirmText: 'Backup',
    });
    if (!confirmed) { toast('Backup cancelled'); return; }
    setIsReadAllRunning(true);
    try {
      await executeOperation({
        operation: 'Read all partitions', type: 'read', partitionName: 'all-partitions',
        partitionSize: `${backupCount} partitions`, successMessage: `Backup complete! ${backupCount} partitions backed up`,
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Starting read-all backup (${backupCount} partitions)...` }); },
        run: (operationId) => PartitionApi.readAll(daPath, outputDir, skipList, preloaderPath || undefined, operationId),
      });
    } finally { setIsReadAllRunning(false); }
  };

  const handleSelectRestoreDir = async () => {
    const dir = await selectFile(DialogType.BACKUP_FOLDER);
    if (dir) { setRestoreDir(dir); toast.success('Backup folder selected'); }
  };

  const handleRestoreAll = async () => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    if (!restoreDir) { toast.error('Select a backup folder first'); return; }
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
      variant: 'danger', confirmText: 'Restore', countdownSeconds: 15,
    });
    if (!confirmed) { toast('Restore cancelled'); return; }
    setIsRestoreRunning(true);
    try {
      await executeOperation({
        operation: 'Restore all partitions', type: 'write', partitionName: 'all-partitions',
        partitionSize: 'restore', successMessage: 'Restore complete!', errorMessage: 'Failed to restore partitions',
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Starting write-all restore...' }); },
        run: (operationId) => PartitionApi.writeAll(daPath, restoreDir, preloaderPath || undefined, operationId),
      });
    } finally { setIsRestoreRunning(false); }
  };

  // ═══════════════════════════════════════════
  // ADVANCED TAB handlers
  // ═══════════════════════════════════════════

  const handleSeccfg = async (action: 'unlock' | 'lock') => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    const isUnlock = action === 'unlock';
    const confirmed = await confirm({
      title: isUnlock ? 'Unlock Bootloader' : 'Lock Bootloader',
      message: isUnlock ? (
        <div>
          <p className="mb-2 font-semibold text-error">WARNING: UNLOCKING THE BOOTLOADER</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li><li>Your warranty may be voided</li><li>Security features will be disabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ) : (
        <div>
          <p className="mb-2 font-semibold text-error">WARNING: LOCKING THE BOOTLOADER</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li><li>You will not be able to flash custom ROMs</li><li>Security features will be re-enabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ),
      variant: 'danger', confirmText: isUnlock ? 'Unlock' : 'Lock', countdownSeconds: 15,
    });
    if (!confirmed) { toast('Operation cancelled'); return; }
    setIsSeccfgRunning(true);
    try {
      await executeOperation({
        operation: `Seccfg ${action}`, type: 'write', partitionName: `seccfg-${action}`, partitionSize: 'bootloader',
        successMessage: `Bootloader ${action}ed successfully!`, errorMessage: `Failed to ${action} bootloader`,
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Starting seccfg ${action}...` }); },
        run: (operationId) => DeviceApi.seccfgOperation(daPath, action, preloaderPath || undefined, operationId),
      });
    } finally { setIsSeccfgRunning(false); }
  };

  const handleForceFastboot = async () => {
    if (isFastbootRunning) return;
    setIsFastbootRunning(true); setFastbootStatus('start'); setFastbootMessage('Starting fastboot attempt...');
    try {
      const { FastbootApi } = await import('../services/api/fastbootApi');
      const result = await FastbootApi.forceFastboot();
      setFastbootStatus(result.status); setFastbootMessage(result.message);
      switch (result.status) {
        case 'success': toast.success(result.message || 'Device switched to Fastboot mode'); break;
        case 'cancelled': toast('Fastboot attempt cancelled'); break;
        case 'no_device': case 'no_ack': case 'open_error': case 'error': toast.error(result.message || 'Fastboot attempt failed'); break;
      }
    } catch { toast.error('Failed to start fastboot attempt'); } finally { setIsFastbootRunning(false); }
  };

  const handleCancelFastboot = async () => {
    try { const { FastbootApi } = await import('../services/api/fastbootApi'); await FastbootApi.cancelForceFastboot(); } catch { toast.error('Failed to cancel fastboot attempt'); }
  };

  const handleSelectBootPlFile = async () => { const file = await selectFile(DialogType.SINGLE_FILE); if (file) setBootPlFile(file); };
  const handleBootPl = async () => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    if (!bootPlFile) { toast.error('Select a preloader file first'); return; }
    const confirmed = await confirm({
      title: 'Boot Custom Preloader',
      message: (
        <div>
          <p className="mb-2 font-semibold text-warning">WARNING: BOOT CUSTOM PRELOADER</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>This will temporarily boot a custom preloader in BootROM</li><li>The preloader is loaded without verification</li><li>Device must be in BootROM mode</li>
          </ul>
          <p className="mt-3">Continue?</p>
        </div>
      ),
      variant: 'warning', confirmText: 'Boot',
    });
    if (!confirmed) { toast('Operation cancelled'); return; }
    setIsBootPlRunning(true);
    try {
      await executeOperation({
        operation: 'Boot preloader', type: 'write', partitionName: 'boot-pl', partitionSize: 'preloader',
        successMessage: 'Preloader booted successfully!', errorMessage: 'Failed to boot preloader',
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Booting custom preloader: ${bootPlFile.split(/[\\/]/).pop()}...` }); },
        run: (operationId) => DeviceApi.bootPl(daPath, bootPlFile, preloaderPath || undefined, undefined, false, operationId),
      });
    } finally { setIsBootPlRunning(false); }
  };

  const handleSetSlot = async (slot: 'a' | 'b') => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    const confirmed = await confirm({ title: `Set Slot ${slot.toUpperCase()}`, message: `Set the active boot slot to ${slot.toUpperCase()}?`, variant: 'warning', confirmText: 'Set' });
    if (!confirmed) { toast('Operation cancelled'); return; }
    setIsSlotRunning(true);
    try {
      await executeOperation({
        operation: `Set active slot ${slot.toUpperCase()}`, type: 'write', partitionName: `slot-${slot}`, partitionSize: 'bootloader',
        successMessage: `Active slot set to ${slot.toUpperCase()} successfully!`, errorMessage: `Failed to set active slot to ${slot.toUpperCase()}`,
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Setting active boot slot to ${slot.toUpperCase()}...` }); },
        run: (operationId) => AdvancedApi.setActiveSlot(daPath, slot, preloaderPath || undefined, operationId),
      });
    } finally { setIsSlotRunning(false); }
  };

  const handleCrash = async () => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    const confirmed = await confirm({ title: 'Send Crash Command', message: 'Send the debug crash command to the device. This will cause the device to crash on purpose. Continue?', variant: 'danger', confirmText: 'Send' });
    if (!confirmed) { toast('Operation cancelled'); return; }
    setIsCrashRunning(true);
    try {
      await executeOperation({
        operation: 'Send crash command', type: 'write', partitionName: 'crash', partitionSize: 'debug',
        successMessage: 'Crash command sent successfully!', errorMessage: 'Failed to send crash command',
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Sending crash command...' }); },
        run: (operationId) => DeviceApi.crash(daPath, preloaderPath || undefined, operationId),
      });
    } finally { setIsCrashRunning(false); }
  };

  const handleReadEfuses = async () => {
    if (!daPath || !isConnected) { toast.error('Please connect to device first'); return; }
    const outputPath = await selectFile(DialogType.OUTPUT_FOLDER);
    if (!outputPath) return;
    setIsReadEfusesRunning(true);
    try {
      await executeOperation({
        operation: 'Read eFuses', type: 'read', partitionName: 'efuses', partitionSize: 'eFuse',
        successMessage: 'eFuses read successfully!', errorMessage: 'Failed to read eFuses',
        onStart: () => { addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Reading eFuses...' }); },
        run: (operationId) => PartitionApi.readEfuses(daPath, outputPath, preloaderPath || undefined, operationId),
      });
    } finally { setIsReadEfusesRunning(false); }
  };

  const backupCount = partitions.length - skipPartitions.size;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-6xl space-y-4">
          <Tabs tabs={[...FLASH_TABS]} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* ══════════ PARTITIONS TAB ══════════ */}
          {activeTab === 'partitions' && (
            <>
              {!isConnected && !isConnecting && (
                <SpotlightCard>
                  <Panel title="PGPT" accent>
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="rounded-xl bg-muted p-4"><Zap className="h-8 w-8 text-trace-copper" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">No Device Connected</h3>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Connect a device to access partition management, read/write operations, and flash tools.</p>
                      </div>
                    </div>
                  </Panel>
                </SpotlightCard>
              )}

              {isConnected && (
                <div className="flex gap-4">
                  <div className="flex w-64 shrink-0 flex-col gap-3">
                    <Panel title="ACTIONS" accent>
                      <div className="flex flex-col gap-1">
                        <button onClick={handleFastBackup} disabled={isBackupRunning} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-all hover:bg-accent/30 disabled:opacity-40">
                          <span className="text-trace-copper"><Zap className="h-4 w-4" /></span>
                          <span className="flex-1">{isBackupRunning ? 'Backing up...' : 'Backup NVRAM'}</span>
                        </button>
                        <button onClick={handleBackupSelected} disabled={isBackupRunning || selectedPartitions.size === 0} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-all hover:bg-accent/30 disabled:opacity-40">
                          <span className="text-trace-copper"><Package className="h-4 w-4" /></span>
                          <span className="flex-1">{isBackupRunning ? 'Backing up...' : `Backup Selected (${selectedPartitions.size})`}</span>
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button onClick={handleSelectOutput} disabled={isBackupRunning} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-all hover:bg-accent/30 disabled:opacity-40">
                          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{defaultOutputPath ? getBasename(defaultOutputPath) : 'Select Output Folder'}</span>
                          {defaultOutputPath && !isBackupRunning && <X className="h-3.5 w-3.5 shrink-0 text-error" onClick={(e) => { e.stopPropagation(); void handleClearOutput(); }} />}
                        </button>
                      </div>
                    </Panel>
                    <Panel title="STATUS">
                      <div className="flex flex-col gap-2">
                        <StatusCard label="DA" value={daPath ? getBasename(daPath) : 'Not selected'} />
                        <StatusCard label="PL" value={preloaderPath ? getBasename(preloaderPath) : 'Not selected'} />
                      </div>
                    </Panel>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Panel title="DEVICE INFO" accent padded={false} className="h-full">
                      {isConnecting ? (
                        <div className="flex h-32 items-center justify-center"><div className="text-sm text-muted-foreground">Loading partitions...</div></div>
                      ) : (
                        <PartitionTable
                          partitions={partitions} selectedPartitions={selectedPartitions}
                          onToggleSelected={handleToggleSelected} onSelectAllSelected={handleSelectAllSelected}
                          onRead={handleRead} onWrite={handleWrite} onFormat={handleFormat} onErase={handleErase}
                        />
                      )}
                    </Panel>
                  </div>
                </div>
              )}

              <ProgressWidget isActive={isOperationRunning} operationType={operationType} partitionName={operationPartition} partitionSize={operationSize || undefined} startTime={operationStart} />
              <OperationModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, partition: null, operation: 'read' })} partition={modalState.partition} operation={modalState.operation} />
            </>
          )}

          {/* ══════════ SCATTER FLASH TAB ══════════ */}
          {activeTab === 'scatter' && (
            <>
              <FlashProgressModal isOpen={showFlashModal && !flashModalMinimized} onClose={handleFlashModalClose} onMinimize={handleFlashModalMinimize} currentPartition={currentFlashingPartition} currentIndex={currentFlashIndex} totalCount={totalFlashCount} />

              {!scatterFile ? (
                <ScatterDropzone onLoadPath={loadScatterPath} onSelectFolder={handleSelectScatterFolder} onSelectFile={handleSelectScatterFile} isLoading={isLoadingScatter} />
              ) : (
                <>
                  <ScatterInfoBar scatterFile={scatterFile} onSelectAll={handleSelectAllScatter} onClearAll={handleClearAllScatter} onClearScatter={handleClearScatter} />

                  {isFlashing && (
                    <div className="flex flex-shrink-0 items-center gap-3 rounded-md border border-trace-copper bg-accent-soft p-3">
                      <Loader2 className="h-5 w-5 animate-spin text-trace-copper" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">Flashing {currentFlashIndex} of {totalFlashCount}</p>
                        <p className="truncate font-mono text-xs text-trace-copper">{currentFlashingPartition || 'Starting...'}</p>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-trace-copper">{Math.round((currentFlashIndex / Math.max(totalFlashCount, 1)) * 100)}%</span>
                    </div>
                  )}

                  <FlashPartitionTable partitions={downloadPartitions} selectedPartitions={scatterSelected} partitionImages={partitionImages} onTogglePartition={handleToggleScatterPartition} onSelectImage={handleSelectImage} />

                  <FlashActionBar selectedCount={selectedCount} selectedWithImagesCount={selectedWithImagesCount} missingImagesCount={missingImagesCount} canFlash={canFlash && !isFlashing} isFlashing={isFlashing} currentFlashIndex={currentFlashIndex} totalFlashCount={totalFlashCount} isConnected={isConnected} daPath={daPath} onFlash={handleFlash} />
                </>
              )}

              {scatterError && (
                <div className="flex-shrink-0 rounded-md border border-error bg-error/10 p-3 text-sm text-error">
                  <p className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" />{scatterError}</p>
                </div>
              )}

              <div className="flex-shrink-0 border-t border-border p-3"><OutputLogPanel /></div>
            </>
          )}

          {/* ══════════ BACKUP & RESTORE TAB ══════════ */}
          {activeTab === 'backup' && (
            <>
              {!isConnected && <ConnectionWarning />}

              <ReadAllSection
                isConnected={isConnected} isReadAllRunning={isReadAllRunning} isSettingsLoading={!isSettingsLoaded}
                partitions={partitions} skipPartitions={skipPartitions} backupCount={backupCount}
                onSelectAllSkip={handleSelectAllSkip} onClearAllSkip={handleClearAllSkip} onToggleSkip={handleToggleSkip}
                onReadAll={handleReadAll}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RestoreSection
                  isConnected={isConnected} isRestoreRunning={isRestoreRunning} isSettingsLoading={!isSettingsLoaded}
                  backupDir={restoreDir} onSelectDir={handleSelectRestoreDir}
                  onClearDir={() => setRestoreDir(null)} onRestore={handleRestoreAll}
                />
                <FastbootSection isRunning={isFastbootRunning} status={fastbootStatus} statusMessage={fastbootMessage} onForceFastboot={handleForceFastboot} onCancel={handleCancelFastboot} />
              </div>
            </>
          )}

          {/* ══════════ ADVANCED TAB ══════════ */}
          {activeTab === 'advanced' && (
            <>
              {!isConnected && <ConnectionWarning />}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <BootloaderSection
                  isConnected={isConnected} isSeccfgRunning={isSeccfgRunning} isSettingsLoading={!isSettingsLoaded}
                  isSlotRunning={isSlotRunning} isCrashRunning={isCrashRunning}
                  onUnlock={() => handleSeccfg('unlock')} onLock={() => handleSeccfg('lock')}
                  onSetSlot={handleSetSlot} onCrash={handleCrash}
                />

                <BootPlSection
                  isConnected={isConnected} isRunning={isBootPlRunning} isSettingsLoading={!isSettingsLoaded}
                  filePath={bootPlFile} onSelectFile={handleSelectBootPlFile}
                  onClearFile={() => setBootPlFile(null)} onBoot={handleBootPl}
                />

                <SpotlightCard className="overflow-hidden">
                  <Panel title="RAW FLASH" accent padded={false}>
                    <div className="flex flex-col gap-4 p-4">
                      <p className="text-sm text-muted-foreground">
                        Read/write/erase raw flash at specific addresses. Bypasses partition table.
                      </p>
                      <p className="text-xs text-warning">
                        Advanced: incorrect addresses may brick your device.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                          Use the partition table actions or scatter flash for standard operations.
                          Raw flash is for accessing areas without named partitions.
                        </div>
                      </div>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard className="overflow-hidden">
                  <Panel title="EFUSE" accent padded={false}>
                    <div className="flex flex-col gap-4 p-4">
                      <p className="text-sm text-muted-foreground">
                        Read one-time-programmable fuses from the SoC. Stores chip identity, security config, and hardware keys.
                      </p>
                      <p className="text-xs text-warning">
                        eFuse data is read-only. Cannot be written from software.
                      </p>
                      <button
                        onClick={handleReadEfuses}
                        disabled={!isConnected || isReadEfusesRunning}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-trace-copper px-4 py-2 text-sm font-medium text-white hover:bg-trace-copper/80 disabled:opacity-50"
                      >
                        {isReadEfusesRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {isReadEfusesRunning ? 'Reading eFuses...' : 'Read eFuses'}
                      </button>
                    </div>
                  </Panel>
                </SpotlightCard>
              </div>
            </>
          )}
        </PageTransition>
      </main>
    </div>
  );
}
