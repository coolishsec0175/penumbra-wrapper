import { useState } from 'react';
import { FileDown, FileUp, FolderOpen, ShieldCheck } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DialogType } from '../../services/dialogs/fileDialogService';
import { useFileSelection } from '../../hooks/useFileSelection';

interface RpmbSectionProps {
  isConnected: boolean;
  isRunning: boolean;
  isSettingsLoading: boolean;
  onRead: (options: {
    filePath: string;
    region?: number;
    startSector?: number;
    numSectors?: number;
  }) => void;
  onWrite: (options: {
    filePath: string;
    region?: number;
    startSector?: number;
    numSectors?: number;
  }) => void;
  onAuth: (key: string, region?: number) => void;
}

export function RpmbSection({
  isConnected,
  isRunning,
  isSettingsLoading,
  onRead,
  onWrite,
  onAuth,
}: RpmbSectionProps) {
  const { selectFile, saveFile } = useFileSelection();
  const [filePath, setFilePath] = useState('');
  const [key, setKey] = useState('');
  const [region, setRegion] = useState('');
  const [startSector, setStartSector] = useState('');
  const [numSectors, setNumSectors] = useState('');

  const parseOptional = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const handleSelectOutput = async () => {
    const path = await saveFile({
      title: 'Save RPMB Dump',
      defaultExtension: 'bin',
    });
    if (path) {
      setFilePath(path);
    }
  };

  const handleSelectInput = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select RPMB Input File',
    });
    if (path) {
      setFilePath(path);
    }
  };

  const canRead = isConnected && !isRunning && !isSettingsLoading && !!filePath;
  const canWrite = canRead;
  const canAuth = isConnected && !isRunning && !isSettingsLoading && key.trim().length > 0;

  const options = {
    region: parseOptional(region),
    startSector: parseOptional(startSector),
    numSectors: parseOptional(numSectors),
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">RPMB</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Read, write, or authenticate with the RPMB partition.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Region</label>
          <Input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="0"
            disabled={isRunning}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Start Sector</label>
          <Input
            value={startSector}
            onChange={(e) => setStartSector(e.target.value)}
            placeholder="0"
            disabled={isRunning}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Num Sectors</label>
          <Input
            value={numSectors}
            onChange={(e) => setNumSectors(e.target.value)}
            placeholder="0"
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSelectInput} disabled={isRunning} variant="outline" size="sm">
          <FolderOpen className="h-4 w-4" />
          Select Input
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
          onClick={() => onRead({ filePath, ...options })}
          disabled={!canRead}
          size="sm"
        >
          <FileDown className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Read
        </Button>
        <Button
          onClick={() => onWrite({ filePath, ...options })}
          disabled={!canWrite}
          variant="warning"
          size="sm"
        >
          <FileUp className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Write
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Authentication Key (hex)
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="deadbeef..."
              disabled={isRunning}
              className="rounded-md"
            />
          </div>
          <Button
            onClick={() => onAuth(key.trim(), options.region)}
            disabled={!canAuth}
            variant="secondary"
            size="sm"
          >
            <ShieldCheck className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
            Authenticate
          </Button>
        </div>
      </div>
    </section>
  );
}
