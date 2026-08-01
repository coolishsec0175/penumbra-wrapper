import { useEffect, useState } from 'react';
import { X, Download, Loader2, PackageCheck } from 'lucide-react';
import { useWrapperUpdateStore, type WrapperUpdateInfo } from '../store/wrapperUpdateStore';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

interface WrapperUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  updateInfo: WrapperUpdateInfo | null;
  isDownloading?: boolean;
}

export function WrapperUpdateModal({
  isOpen,
  onClose,
  onDownload,
  updateInfo,
  isDownloading = false,
}: WrapperUpdateModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isCheckingUpdate = useWrapperUpdateStore((state) => state.isCheckingUpdate);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setIsVisible(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDownloading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDownloading]);

  if (!isVisible && !isOpen) return null;
  if (!updateInfo) return null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={!isDownloading ? onClose : undefined}
      />

      <div
        className={cn(
          'fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-3 transition-all duration-300',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        <Card variant="elevated" className="overflow-hidden border-primary bg-surface">
          <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border p-4">
            <div className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary" />
              <div className="space-y-1">
                <CardTitle className="text-xl">PenumbraWrapper Update Available</CardTitle>
                <p className="text-sm text-muted-foreground">
                  A new version of PenumbraWrapper is available. Download and restart to update?
                </p>
              </div>
            </div>
            <Button onClick={onClose} disabled={isDownloading} variant="ghost" size="icon">
              <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 p-4 text-foreground">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New version:</span>
                <span className="font-mono text-primary">{updateInfo.version}</span>
              </div>
              {updateInfo.date && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Published:</span>
                  <span className="font-mono">{new Date(updateInfo.date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {updateInfo.body && (
              <div className="space-y-1 text-sm">
                <span className="text-muted-foreground">What's new:</span>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface-alt p-2 font-mono text-xs">
                  {updateInfo.body}
                </pre>
              </div>
            )}

            {isDownloading && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading and installing...
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-end border-t border-border bg-surface p-4">
            <Button onClick={onClose} disabled={isDownloading} variant="outline">
              Later
            </Button>
            <Button onClick={onDownload} disabled={isDownloading || isCheckingUpdate}>
              <Download className="h-4 w-4" />
              {isDownloading ? 'Installing...' : 'Download & Restart'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
