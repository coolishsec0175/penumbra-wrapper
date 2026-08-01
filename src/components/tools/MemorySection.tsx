import { useState } from 'react';
import { FileDown, FileUp, FolderOpen } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DialogType } from '../../services/dialogs/fileDialogService';
import { useFileSelection } from '../../hooks/useFileSelection';

interface MemorySectionProps {
  isConnected: boolean;
  isRunning: boolean;
  isSettingsLoading: boolean;
  onRead: (address: string, length: string, outputPath: string) => void;
  onWrite: (address: string, filePath: string) => void;
}

export function MemorySection({
  isConnected,
  isRunning,
  isSettingsLoading,
  onRead,
  onWrite,
}: MemorySectionProps) {
  const { selectFile, saveFile } = useFileSelection();
  const [address, setAddress] = useState('0x0');
  const [length, setLength] = useState('');
  const [filePath, setFilePath] = useState('');

  const handleSelectOutput = async () => {
    const path = await saveFile({
      title: 'Save Memory Dump',
      defaultExtension: 'bin',
    });
    if (path) {
      setFilePath(path);
    }
  };

  const handleSelectInput = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select Input File',
    });
    if (path) {
      setFilePath(path);
    }
  };

  const canRun = isConnected && !isRunning && !isSettingsLoading && !!address;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Memory Operations</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Read (peek) or write (poke) raw memory at an address. Requires DA Extensions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x0"
            disabled={isRunning}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Length (bytes)</label>
          <Input
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="0x20000"
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSelectInput}
          disabled={isRunning}
          variant="outline"
          size="sm"
        >
          <FolderOpen className="h-4 w-4" />
          Select Input
        </Button>
        <Button
          onClick={handleSelectOutput}
          disabled={isRunning}
          variant="outline"
          size="sm"
        >
          <FolderOpen className="h-4 w-4" />
          Select Output
        </Button>
        {filePath && (
          <span className="truncate font-mono text-xs text-muted-foreground">{filePath}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onRead(address, length, filePath)}
          disabled={!canRun || !length || !filePath}
          size="sm"
        >
          <FileDown className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Peek (Read)
        </Button>
        <Button
          onClick={() => onWrite(address, filePath)}
          disabled={!canRun || !filePath}
          variant="warning"
          size="sm"
        >
          <FileUp className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Poke (Write)
        </Button>
      </div>
    </section>
  );
}
