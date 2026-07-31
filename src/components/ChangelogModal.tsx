import { useState } from 'react';
import { X, FileClock, RefreshCw } from 'lucide-react';
import { AntumbraApi } from '../services/api/antumbraApi';
import type { AntumbraReleaseNote } from '../types';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [notes, setNotes] = useState<AntumbraReleaseNote[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChangelog = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await AntumbraApi.getChangelog();
      setNotes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FileClock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Antumbra Release Notes</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadChangelog}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-surface-alt disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading release notes...</p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          {!isLoading && !error && notes === null && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Fetch the latest antumbra release notes from GitHub.
              </p>
              <button
                onClick={loadChangelog}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Load release notes
              </button>
            </div>
          )}
          {!isLoading && notes && notes.length === 0 && (
            <p className="text-sm text-muted-foreground">No releases found.</p>
          )}
          {!isLoading &&
            notes?.map((note) => (
              <div key={note.tag_name} className="mb-4 rounded-md border border-border bg-surface-alt p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-sm font-semibold text-foreground">{note.tag_name}</h3>
                  {note.published_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {note.name && note.name !== note.tag_name && (
                  <p className="mt-1 text-sm text-muted-foreground">{note.name}</p>
                )}
                {note.body && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
                    {note.body}
                  </pre>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
