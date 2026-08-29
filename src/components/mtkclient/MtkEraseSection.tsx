import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { Panel } from '../penumbra/Panel';
import { MtkClientApi } from '../../services/api/mtkclientApi';
import { useMtkClientStore } from '../../store/mtkclientStore';
import { useConfirmation } from '../../hooks/useConfirmation';
import { executeOperation } from '../../services/operations/executeOperation';

const COMMON_PARTITIONS = [
  'preloader', 'proinfo', 'nvram', 'bootimg', 'recovery',
  'system', 'userdata', 'cache', 'secfg', 'tee1', 'tee2',
  'lk', 'lk2', 'para', 'expdb', 'frp', 'nvdata', 'protect1',
  'protect2', 'seccfg', 'uboot', 'boot_a', 'boot_b',
  'super', 'vbmeta', 'vbmeta_system',
];

export function MtkEraseSection() {
  const { isIotMode } = useMtkClientStore();
  const { confirm } = useConfirmation();
  const [partition, setPartition] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleErase = async () => {
    if (!partition) {
      toast.error('Select a partition');
      return;
    }

    const confirmed = await confirm({
      title: 'Erase Partition',
      message: `WARNING: This will PERMANENTLY ERASE partition "${partition}". All data will be lost!`,
      variant: 'danger',
      confirmText: 'Erase',
      countdownSeconds: 10,
    });
    if (!confirmed) return;

    setIsRunning(true);
    try {
      await executeOperation({
        operation: `MTK Erase ${partition}`,
        type: 'write',
        partitionName: partition,
        successMessage: `Partition ${partition} erased successfully`,
        run: () =>
          MtkClientApi.erasePartition(
            partition,
            isIotMode,
            undefined,
            undefined
          ),
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <SpotlightCard>
      <Panel title="Erase Partition" accent dot>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Partition
            </label>
            <select
              value={partition}
              onChange={(e) => setPartition(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select partition...</option>
              {COMMON_PARTITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleErase}
            disabled={isRunning || !partition}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-error/80 px-4 py-2 text-sm font-medium text-white hover:bg-error disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isRunning ? 'Erasing...' : 'Erase Partition'}
          </button>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
