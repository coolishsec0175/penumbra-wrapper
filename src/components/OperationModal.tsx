import { useState, useEffect, useCallback, memo } from 'react';
import { X, FolderOpen, AlertTriangle } from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import type { Partition } from '../types';
import { PartitionApi } from '../services/api/partitionApi';
import { executeOperation } from '../services/operations/executeOperation';
import { DialogType } from '../services/dialogs/fileDialogService';
import { generateTimestampedFilename, joinPath, getBasename } from '../services/utils/pathUtils';
import { exists } from '@tauri-apps/plugin-fs';
import { useFileSelection } from '../hooks/useFileSelection';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  partition: Partition | null;
  operation: 'read' | 'write';
}

export const OperationModal = memo<OperationModalProps>(
  ({ isOpen, onClose, partition, operation }) => {
    const { daPath, preloaderPath, defaultOutputPath } = useDeviceStore();
    const { selectFile, saveFile } = useFileSelection();
    const [filePath, setFilePath] = useState<string>('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

    const checkFileExists = useCallback(async (path: string) => {
      try {
        const fileExists = await exists(path);
        setShowOverwriteConfirm(fileExists);
      } catch (error) {
        console.error('Error checking file existence:', error);
      }
    }, []);

    useEffect(() => {
      if (isOpen && partition) {
        setFilePath('');
        setIsExecuting(false);
        setShowOverwriteConfirm(false);

        if (operation === 'read' && defaultOutputPath) {
          const filename = generateTimestampedFilename(partition.name, 'img');
          const autoPath = joinPath(defaultOutputPath, filename);
          setFilePath(autoPath);
          checkFileExists(autoPath);
        }
      }
    }, [isOpen, partition, operation, defaultOutputPath, checkFileExists]);

    useEffect(() => {
      if (!isOpen) return;
      if (operation !== 'read') {
        setShowOverwriteConfirm(false);
        return;
      }
      if (!filePath) {
        setShowOverwriteConfirm(false);
        return;
      }

      checkFileExists(filePath);
    }, [filePath, operation, isOpen, checkFileExists]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen && !isExecuting) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isExecuting, onClose]);

    const handleBrowse = useCallback(async () => {
      if (operation === 'write') {
        const selected = await selectFile(DialogType.IMAGE_FILE, undefined, {
          title: 'Select Image File',
        });
        if (selected) {
          setFilePath(selected as string);
        }
      } else {
        const defaultName = generateTimestampedFilename(partition?.name || 'partition', 'img');
        const defaultPath = defaultOutputPath
          ? joinPath(defaultOutputPath, defaultName)
          : defaultName;

        const selected = await saveFile({
          title: 'Save Partition Backup',
          defaultPath,
          defaultExtension: 'img',
        });
        if (selected) {
          setFilePath(selected as string);
          setShowOverwriteConfirm(false);
        }
      }
    }, [operation, partition, defaultOutputPath, selectFile, saveFile]);

    const handleStart = useCallback(
      async (forceOverwrite: boolean = false) => {
        if (!partition || !filePath) return;

        if (showOverwriteConfirm && !forceOverwrite) {
          return;
        }

        setIsExecuting(true);
        onClose();

        try {
          if (operation === 'write') {
            await executeOperation({
              operation: 'Write partition',
              type: 'write',
              partitionName: partition.name,
              partitionSize: partition.display_size,
              successMessage: `Successfully flashed ${partition.name}`,
              run: (operationId) =>
                PartitionApi.write({
                  daPath: daPath!,
                  partition: partition.name,
                  imagePath: filePath,
                  preloaderPath: preloaderPath || undefined,
                  operationId,
                }),
            });
          } else {
            await executeOperation({
              operation: 'Read partition',
              type: 'read',
              partitionName: partition.name,
              partitionSize: partition.display_size,
              successMessage: `Successfully read ${partition.name}`,
              run: (operationId) =>
                PartitionApi.read({
                  daPath: daPath!,
                  partition: partition.name,
                  outputPath: filePath,
                  preloaderPath: preloaderPath || undefined,
                  operationId,
                }),
            });
          }
        } finally {
          setIsExecuting(false);
        }
      },
      [partition, filePath, showOverwriteConfirm, operation, daPath, preloaderPath, onClose]
    );

    const handleOverwrite = useCallback(() => {
      setShowOverwriteConfirm(false);
      handleStart(true);
    }, [handleStart]);

    const handleChooseDifferent = useCallback(() => {
      setShowOverwriteConfirm(false);
      handleBrowse();
    }, [handleBrowse]);

    if (!isOpen || !partition) return null;

    const canStart = filePath && !isExecuting && !showOverwriteConfirm;
    const getFilename = (path: string) => getBasename(path);

    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200"
          onClick={!isExecuting ? onClose : undefined}
        >
          <Card
            variant="elevated"
            className="relative w-full max-w-sm overflow-hidden border-border bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {showOverwriteConfirm && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-warning bg-surface p-4">
                <AlertTriangle className="mb-4 h-12 w-12 text-warning" />
                <h3 className="mb-2 text-center text-lg font-semibold text-foreground">
                  File Already Exists
                </h3>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  The output file already exists. Do you want to overwrite it?
                </p>
                <p className="mb-6 max-w-full break-all px-4 text-center font-mono text-xs text-subtle-foreground">
                  {filePath}
                </p>
                <div className="flex w-full gap-3">
                  <Button onClick={handleChooseDifferent} variant="outline" className="flex-1">
                    Choose Different
                  </Button>
                  <Button onClick={handleOverwrite} variant="warning" className="flex-1">
                    Overwrite
                  </Button>
                </div>
              </div>
            )}

            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>{operation === 'write' ? 'Write' : 'Read'} Partition</CardTitle>
              <Button onClick={onClose} disabled={isExecuting} variant="ghost" size="icon">
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <Card variant="subtle" className="space-y-1 border-border p-3">
                <div className="text-xs text-subtle-foreground">Partition</div>
                <div className="font-mono text-sm text-foreground">{partition.name}</div>
                {partition.display_size && (
                  <div className="text-xs text-muted-foreground">Size: {partition.display_size}</div>
                )}
              </Card>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {operation === 'write' ? 'Image File' : 'Output File'}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder={operation === 'write' ? 'Select image file...' : 'Select output location...'}
                      disabled={isExecuting}
                      className="rounded-md"
                    />
                  </div>
                  <Button onClick={handleBrowse} disabled={isExecuting} variant="outline" size="icon" title="Browse">
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                {filePath && (
                  <div className="mt-2 text-xs text-subtle-foreground break-all">{getFilename(filePath)}</div>
                )}
              </div>
            </CardContent>

            <CardFooter className="justify-end">
              <Button onClick={onClose} disabled={isExecuting} variant="outline">
                Cancel
              </Button>
              <Button onClick={() => handleStart()} disabled={!canStart}>
                {isExecuting ? 'Starting...' : 'Start'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </>
    );
  }
);

OperationModal.displayName = 'OperationModal';
