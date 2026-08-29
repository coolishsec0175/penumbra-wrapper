import { useState } from 'react';
import { Key, Lock, Unlock } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { Panel } from '../penumbra/Panel';
import { MtkClientApi } from '../../services/api/mtkclientApi';
import { useMtkClientStore } from '../../store/mtkclientStore';
import { useConfirmation } from '../../hooks/useConfirmation';
import { executeOperation } from '../../services/operations/executeOperation';

export function MtkKeysSection() {
  const { isIotMode } = useMtkClientStore();
  const { confirm } = useConfirmation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLockRunning, setIsLockRunning] = useState(false);
  const [isUnlockRunning, setIsUnlockRunning] = useState(false);

  const handleGenerateKeys = async () => {
    const confirmed = await confirm({
      title: 'Generate Hardware Keys',
      message: 'Generate device hardware keys? This requires DA mode access.',
      variant: 'info',
      confirmText: 'Generate',
    });
    if (!confirmed) return;

    setIsGenerating(true);
    try {
      await executeOperation({
        operation: 'MTK Generate Keys',
        type: 'read',
        partitionName: 'keys',
        successMessage: 'Keys generated successfully',
        run: () => MtkClientApi.generateKeys(isIotMode),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLock = async () => {
    const confirmed = await confirm({
      title: 'Lock Bootloader',
      message: 'Lock the device bootloader? This may wipe data.',
      variant: 'danger',
      confirmText: 'Lock',
      countdownSeconds: 10,
    });
    if (!confirmed) return;

    setIsLockRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Lock Bootloader',
        type: 'write',
        partitionName: 'seccfg-lock',
        successMessage: 'Bootloader locked',
        run: () => MtkClientApi.seccfg('lock', isIotMode),
      });
    } finally {
      setIsLockRunning(false);
    }
  };

  const handleUnlock = async () => {
    const confirmed = await confirm({
      title: 'Unlock Bootloader',
      message: 'WARNING: Unlocking the bootloader may WIPE ALL DATA. Continue?',
      variant: 'danger',
      confirmText: 'Unlock',
      countdownSeconds: 15,
    });
    if (!confirmed) return;

    setIsUnlockRunning(true);
    try {
      await executeOperation({
        operation: 'MTK Unlock Bootloader',
        type: 'write',
        partitionName: 'seccfg-unlock',
        successMessage: 'Bootloader unlocked',
        run: () => MtkClientApi.seccfg('unlock', isIotMode),
      });
    } finally {
      setIsUnlockRunning(false);
    }
  };

  return (
    <SpotlightCard>
      <Panel title="Keys & Bootloader" accent dot>
        <div className="space-y-3">
          <button
            onClick={handleGenerateKeys}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Key className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Keys'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUnlock}
              disabled={isUnlockRunning}
              className="flex items-center justify-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning hover:bg-warning/20 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              {isUnlockRunning ? 'Unlocking...' : 'Unlock BL'}
            </button>

            <button
              onClick={handleLock}
              disabled={isLockRunning}
              className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {isLockRunning ? 'Locking...' : 'Lock BL'}
            </button>
          </div>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
