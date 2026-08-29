import { useState } from 'react';
import { toast } from 'sonner';
import { Cpu, Download, Upload, AlertTriangle, RotateCcw } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { Panel } from '../penumbra/Panel';
import { useFileSelection } from '../../hooks/useFileSelection';
import { DialogType } from '../../services/dialogs/fileDialogService';
import { MtkClientApi } from '../../services/api/mtkclientApi';
import { useMtkClientStore } from '../../store/mtkclientStore';
import { useConfirmation } from '../../hooks/useConfirmation';
import { executeOperation } from '../../services/operations/executeOperation';

export function MtkBootromSection() {
  const { isIotMode } = useMtkClientStore();
  const { confirm } = useConfirmation();
  const { selectFile, saveFile } = useFileSelection();
  const [isDumpBromRunning, setIsDumpBromRunning] = useState(false);
  const [isDumpPreloaderRunning, setIsDumpPreloaderRunning] = useState(false);
  const [isDumpSramRunning, setIsDumpSramRunning] = useState(false);
  const [isCrashRunning, setIsCrashRunning] = useState(false);
  const [isRebootRunning, setIsRebootRunning] = useState(false);

  const handleDumpBrom = async () => {
    const file = await saveFile({
      defaultPath: 'brom.bin',
      defaultExtension: 'bin',
      title: 'Save BROM Dump',
    });
    if (!file) return;

    setIsDumpBromRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Dump BROM',
        type: 'read',
        partitionName: 'brom',
        successMessage: 'BROM dumped successfully',
        run: () => MtkClientApi.dumpBrom(file, isIotMode),
      });
    } finally {
      setIsDumpBromRunning(false);
    }
  };

  const handleDumpPreloader = async () => {
    const file = await saveFile({
      defaultPath: 'preloader.bin',
      defaultExtension: 'bin',
      title: 'Save Preloader Dump',
    });
    if (!file) return;

    setIsDumpPreloaderRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Dump Preloader',
        type: 'read',
        partitionName: 'preloader',
        successMessage: 'Preloader dumped successfully',
        run: () => MtkClientApi.dumpPreloader(file, isIotMode),
      });
    } finally {
      setIsDumpPreloaderRunning(false);
    }
  };

  const handleDumpSram = async () => {
    const file = await saveFile({
      defaultPath: 'sram.bin',
      defaultExtension: 'bin',
      title: 'Save SRAM Dump',
    });
    if (!file) return;

    setIsDumpSramRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Dump SRAM',
        type: 'read',
        partitionName: 'sram',
        successMessage: 'SRAM dumped successfully',
        run: () => MtkClientApi.dumpSram(file, isIotMode),
      });
    } finally {
      setIsDumpSramRunning(false);
    }
  };

  const handleCrash = async () => {
    const confirmed = await confirm({
      title: 'Crash to BROM',
      message: 'This will crash the preloader to force BROM mode. Device may disconnect. Continue?',
      variant: 'warning',
      confirmText: 'Crash',
    });
    if (!confirmed) return;

    setIsCrashRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Crash',
        type: 'write',
        partitionName: 'crash',
        successMessage: 'Crash command sent',
        run: () => MtkClientApi.crash(isIotMode),
      });
    } finally {
      setIsCrashRunning(false);
    }
  };

  const handleReboot = async () => {
    const confirmed = await confirm({
      title: 'Reboot Device',
      message: 'Send reset command to the device?',
      variant: 'info',
      confirmText: 'Reboot',
    });
    if (!confirmed) return;

    setIsRebootRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Reboot',
        type: 'write',
        partitionName: 'reboot',
        successMessage: 'Reboot command sent',
        run: () => MtkClientApi.reboot(isIotMode),
      });
    } finally {
      setIsRebootRunning(false);
    }
  };

  return (
    <SpotlightCard>
      <Panel title="BootROM Tools" accent dot>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDumpBrom}
            disabled={isDumpBromRunning}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isDumpBromRunning ? 'Dumping...' : 'Dump BROM'}
          </button>

          <button
            onClick={handleDumpPreloader}
            disabled={isDumpPreloaderRunning}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isDumpPreloaderRunning ? 'Dumping...' : 'Dump Preloader'}
          </button>

          <button
            onClick={handleDumpSram}
            disabled={isDumpSramRunning}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isDumpSramRunning ? 'Dumping...' : 'Dump SRAM'}
          </button>

          <button
            onClick={handleReboot}
            disabled={isRebootRunning}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {isRebootRunning ? 'Rebooting...' : 'Reboot'}
          </button>

          <button
            onClick={handleCrash}
            disabled={isCrashRunning}
            className="col-span-2 flex items-center justify-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning hover:bg-warning/20 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            {isCrashRunning ? 'Crashing...' : 'Crash to BROM'}
          </button>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
