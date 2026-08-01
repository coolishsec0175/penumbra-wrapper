import { useState } from 'react';
import { FileDown, FileUp, FolderOpen } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DialogType } from '../../services/dialogs/fileDialogService';
import { useFileSelection } from '../../hooks/useFileSelection';

interface ReadFlashSectionProps {
  isConnected: boolean;
  isRunning: boolean;
  isSettingsLoading: boolean;
  onRead: (partition: string, outputPath: string) => void;
  onWrite: (partition: string, imagePath: string) => void;
}

export function ReadFlashSection({
  isConnected,
  isRunning,
  isSettingsLoading,
  onRead,
  onWrite,
}: ReadFlashSectionProps) {
  const { selectFile, saveFile } = useFileSelection();
  const [partition, setPartition] = useState('');
  const [filePath, setFilePath] = useState('');

  const handleSelectOutput = async () => {
    const path = await saveFile({
      title: 'Save Partition Read',
      defaultExtension: 'img',
    });
    if (path) {
      setFilePath(path);
    }
  };

  const handleSelectInput = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select Image File',
    });
    if (path) {
      setFilePath(path);
    }
  };

  const canRun = isConnected && !isRunning && !isSettingsLoading && !!partition.trim() && !!filePath;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Read / Write Flash Partition</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Read or write a flash partition by name (fallback method using the DA).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Partition</label>
          <Input
            value={partition}
            onChange={(e) => setPartition(e.target.value)}
            placeholder="boot"
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSelectInput} disabled={isRunning} variant="outline" size="sm">
          <FolderOpen className="h-4 w-4" />
          Select Image
        </Button>
        <Button onClick={handleSelectOutput} disabled={isRunning} variant="outline" size="sm">
          <FolderOpen className="h-4 w-4" />
          Select Output
        </Button>
        {filePath && (
          <span className="truncate font-mono text-xs text-muted-foreground">{filePath}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onRead(partition.trim(), filePath)}
          disabled={!canRun}
          size="sm"
        >
          <FileDown className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Read
        </Button>
        <Button
          onClick={() => onWrite(partition.trim(), filePath)}
          disabled={!canRun}
          variant="warning"
          size="sm"
        >
          <FileUp className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Write
        </Button>
      </div>
    </section>
  );
}
