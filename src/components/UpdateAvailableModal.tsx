import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';
import type { PenumbraUpdateInfo } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

export interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: PenumbraUpdateInfo | null;
}

export function UpdateAvailableModal({
  isOpen,
  onClose,
  updateInfo,
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
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;
  if (!updateInfo || !updateInfo.update_available) return null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-3 transition-all duration-300',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        <Card variant="elevated" className="overflow-hidden border-primary bg-card">
          <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary" />
              <div className="space-y-1">
                <CardTitle className="text-xl">Update Available</CardTitle>
                <p className="text-sm text-muted-foreground">A new version of Penumbra is available.</p>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-sm text-foreground">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current:</span>
                <span className="font-mono">{updateInfo.current_version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Latest:</span>
                <span className="font-mono text-primary">{updateInfo.latest_version}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t border-border bg-card p-4">
            <Button onClick={onClose} variant="outline">OK</Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
