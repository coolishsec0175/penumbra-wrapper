import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { Panel } from '../penumbra/Panel';
import { useFileSelection } from '../../hooks/useFileSelection';
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

export function MtkReadSection() {
  const { isIotMode } = useMtkClientStore();
  const { confirm } = useConfirmation();
  const { saveFile } = useFileSelection();
  const [partition, setPartition] = useState('');
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleSelectOutput = async () => {
    const file = await saveFile({
      defaultPath: `${partition}.bin`,
      defaultExtension: 'bin',
      title: 'Save Partition As',
    });
    if (file) setOutputFile(file);
  };

  const handleRead = async () => {
    if (!partition) {
      toast.error('Select a partition');
      return;
    }
    if (!outputFile) {
      toast.error('Select output file');
      return;
    }

    const confirmed = await confirm({
      title: 'Read Partition',
      message: `Read partition "${partition}" to:\n${outputFile}`,
      variant: 'info',
      confirmText: 'Read',
    });
    if (!confirmed) return;

    setIsRunning(true);
    try {
      await executeOperation({
        operation: `MTK Read ${partition}`,
        type: 'read',
        partitionName: partition,
        successMessage: `Partition ${partition} read successfully`,
        run: async () => {
          await MtkClientApi.readPartition(partition, outputFile, isIotMode);
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <SpotlightCard>
      <Panel title="Read Partition" accent dot>
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
              Output File
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={outputFile || ''}
                readOnly
                placeholder="Select output file..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleSelectOutput}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                Browse
              </button>
            </div>
          </div>

          <button
            onClick={handleRead}
            disabled={isRunning || !partition || !outputFile}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-trace-copper px-4 py-2 text-sm font-medium text-white hover:bg-trace-copper/80 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isRunning ? 'Reading...' : 'Read Partition'}
          </button>
        </div>
      </Panel>
    </SpotlightCard>
  );
}
