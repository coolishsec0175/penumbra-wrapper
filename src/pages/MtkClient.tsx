import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Cpu, RefreshCw } from 'lucide-react';
import { useMtkClientStore } from '../store/mtkclientStore';
import { MtkClientApi } from '../services/api/mtkclientApi';
import { MtkReadSection } from '../components/mtkclient/MtkReadSection';
import { MtkWriteSection } from '../components/mtkclient/MtkWriteSection';
import { MtkEraseSection } from '../components/mtkclient/MtkEraseSection';
import { MtkBootromSection } from '../components/mtkclient/MtkBootromSection';
import { MtkKeysSection } from '../components/mtkclient/MtkKeysSection';
import { PageTransition } from '../components/ui/PageTransition';
import { Panel } from '../components/penumbra/Panel';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';

export function MtkClient() {
  const { status, isLoading, isIotMode, setStatus, setLoading, setError, setIotMode } =
    useMtkClientStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await MtkClientApi.getStatus(isIotMode);
      setStatus(result);
      if (showToast) {
        if (result.available) {
          toast.success('mtkclient is available');
        } else {
          toast.warning(result.error || 'mtkclient not found');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [isIotMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus(true);
    setIsRefreshing(false);
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-5xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-trace-copper/10">
                <Cpu className="h-5 w-5 text-trace-copper" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">MTKClient</h1>
                <p className="text-xs text-muted-foreground">
                  MediaTek flash and exploit tool (collaboration)
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Status Bar */}
          <SpotlightCard>
            <Panel title="Status" dot={false} padded={false}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status?.available ? 'bg-success' : 'bg-error'
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {status?.available ? 'mtkclient Available' : 'mtkclient Not Found'}
                  </span>
                </div>
                {status?.version && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                    {status.version}
                  </span>
                )}
                {status?.python_path && (
                  <span className="text-xs text-muted-foreground">
                    Python: {status.python_path}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isIotMode}
                      onChange={(e) => setIotMode(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    IoT Mode
                  </label>
                </div>
              </div>
              {status?.error && (
                <div className="border-t border-border bg-error/5 px-4 py-2 text-xs text-error">
                  {status.error}
                </div>
              )}
            </Panel>
          </SpotlightCard>

          {/* Tool Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MtkReadSection />
            <MtkWriteSection />
            <MtkEraseSection />
            <MtkBootromSection />
            <MtkKeysSection />
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
