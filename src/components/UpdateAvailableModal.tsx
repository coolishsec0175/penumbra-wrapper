import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import type { AntumbraUpdateInfo, DownloadProgress } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

export interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  updateInfo: AntumbraUpdateInfo | null;
  isDownloading?: boolean;
  downloadProgress?: DownloadProgress | null;
}

export function UpdateAvailableModal({
  isOpen,
  onClose,
  onDownload,
  updateInfo,
  isDownloading = false,
  downloadProgress = null,
}: UpdateAvailableModalProps) {
  const [isVisible, setIsVisible] = useState(false);

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
  if (!updateInfo || !updateInfo.supported) return null;

  const isFirstInstall = !updateInfo.installed_path || !updateInfo.installed_version;
  const shouldRender = updateInfo.update_available || isFirstInstall;

  if (!shouldRender) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'downloading':
      case 'fetching':
        return 'text-primary';
      case 'verifying':
        return 'text-warning';
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-danger';
      case 'retrying':
      case 'fallback_blocking':
      case 'fallback_curl':
      case 'fallback_powershell':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'downloading' || status === 'fetching' || status === 'verifying' || status === 'replacing') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return null;
  };

  const titleText = isFirstInstall ? 'Antumbra Required' : 'Antumbra Update Available';
  const primaryActionText = isFirstInstall ? 'Download Antumbra' : 'Download Update';
  const messageText = isFirstInstall
    ? 'Antumbra is required to connect to devices. Download it now?'
    : 'A newer antumbra build is available. Download now?';

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
              <Download className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary" />
              <div className="space-y-1">
                <CardTitle className="text-xl">{titleText}</CardTitle>
                <p className="text-sm text-muted-foreground">{messageText}</p>
              </div>
            </div>
            <Button onClick={onClose} disabled={isDownloading} variant="ghost" size="icon">
              <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 p-4 text-foreground">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Installed:</span>
                <span className="font-mono">{isFirstInstall ? 'Not installed' : updateInfo.installed_version || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Latest:</span>
                <span className="font-mono text-primary">{updateInfo.latest_version || 'Unknown'}</span>
              </div>
            </div>

            {updateInfo.installed_path && (
              <div className="space-y-1 text-sm">
                <span className="text-muted-foreground">Install location:</span>
                <div className="overflow-x-auto rounded-md border border-border bg-surface-alt p-2 font-mono text-xs">
                  {updateInfo.installed_path}
                </div>
              </div>
            )}

            {isDownloading && downloadProgress && (
              <Card variant="subtle" className="space-y-3 border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn('flex items-center gap-2 text-sm font-medium', getStatusColor(downloadProgress.status))}>
                    {getStatusIcon(downloadProgress.status)}
                    <span>{downloadProgress.message}</span>
                  </div>
                  {downloadProgress.attempt > 1 && (
                    <Badge variant="outline" className="text-[11px]">
                      Attempt {downloadProgress.attempt}/{downloadProgress.max_attempts}
                    </Badge>
                  )}
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-subtle-foreground">
                  <span>
                    {downloadProgress.total_bytes > 0
                      ? `${formatBytes(downloadProgress.bytes_downloaded)} / ${formatBytes(downloadProgress.total_bytes)}`
                      : downloadProgress.bytes_downloaded > 0
                        ? formatBytes(downloadProgress.bytes_downloaded)
                        : 'Starting...'}
                  </span>
                  <span>{downloadProgress.percentage.toFixed(1)}%</span>
                </div>
              </Card>
            )}
          </CardContent>

          <CardFooter className="justify-end border-t border-border bg-surface p-4">
            <Button onClick={onClose} disabled={isDownloading} variant="outline">
              Later
            </Button>
            <Button onClick={onDownload} disabled={isDownloading || !updateInfo.supported}>
              <Download className="h-4 w-4" />
              {isDownloading ? 'Downloading...' : primaryActionText}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
