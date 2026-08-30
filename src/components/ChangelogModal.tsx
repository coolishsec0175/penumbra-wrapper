import { X, FileClock } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FileClock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">About</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3 text-sm text-foreground">
            <p>
              PenumbraWrapper uses the{' '}
              <a
                href="https://github.com/shomykohai/penumbra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                penumbra-mtk
              </a>{' '}
              library for direct MediaTek device communication.
            </p>
            <p className="text-muted-foreground">
              Visit the{' '}
              <a
                href="https://github.com/coolishsec0175/penumbra-wrapper/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                releases page
              </a>{' '}
              for changelogs and updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
