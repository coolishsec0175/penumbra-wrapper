import { useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { Panel } from '../penumbra/Panel';
import { useFileSelection } from '../../hooks/useFileSelection';
import { DialogType } from '../../services/dialogs/fileDialogService';
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

export function MtkWriteSection() {
  const { isIotMode } = useMtkClientStore();
  const { confirm } = useConfirmation();
  const { selectFile } = useFileSelection();
  const [partition, setPartition] = useState('');
  const [inputFile, setInputFile] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleSelectInput = async () => {
    const file = await selectFile(DialogType.IMAGE_FILE);
    if (file) setInputFile(file);
  };

  const handleWrite = async () => {
    if (!partition) {
      toast.error('Select a partition');
      return;
    }
    if (!inputFile) {
      toast.error('Select input file');
      return;
    }

    const confirmed = await confirm({
      title: 'Write Partition',
      message: `WARNING: This will OVERWRITE partition "${partition}" with:\n${inputFile}`,
      variant: 'danger',
      confirmText: 'Write',
      countdownSeconds: 5,
    });
    if (!confirmed) return;

    setIsRunning(true);
    try {
      await executeOperation({
        operation: `MTK Write ${partition}`,
        type: 'write',
        partitionName: partition,
        successMessage: `Partition ${partition} written successfully`,
        run: () =>
          MtkClientApi.writePartition(
            partition,
            inputFile,
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
      <Panel title="Write Partition" accent dot>
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

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Input File
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputFile || ''}
                readOnly
                placeholder="Select image file..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleSelectInput}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                Browse
              </button>
            </div>
          </div>

          <button
            onClick={handleWrite}
            disabled={isRunning || !partition || !inputFile}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-trace-copper px-4 py-2 text-sm font-medium text-white hover:bg-trace-copper/80 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isRunning ? 'Writing...' : 'Write Partition'}
          </button>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
