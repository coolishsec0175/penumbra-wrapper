import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Zap, RefreshCw, Play, Square, AlertTriangle } from 'lucide-react';
import { useAmonetStore } from '../store/amonetStore';
import { AmonetApi } from '../services/api/amonetApi';
import { PageTransition } from '../components/ui/PageTransition';
import { Panel } from '../components/penumbra/Panel';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';

const EXPLOIT_TYPES = [
  { value: 'kamakiri_v2', label: 'Kamakiri V2 (Recommended)' },
  { value: 'kamakiri_v1', label: 'Kamakiri V1' },
  { value: 'amonet', label: 'Amonet' },
  { value: 'bruteforce', label: 'Bruteforce' },
];

export function AmonetPage() {
  const {
    ports,
    selectedPort,
    exploitType,
    isRunning,
    events,
    error,
    setPorts,
    setSelectedPort,
    setExploitType,
    setRunning,
    addEvent,
    clearEvents,
    setError,
  } = useAmonetStore();

  const [isScanning, setIsScanning] = useState(false);

  const scanPorts = async () => {
    setIsScanning(true);
    try {
      const result = await AmonetApi.scanPorts();
      setPorts(result);
      if (result.length > 0 && !selectedPort) {
        setSelectedPort(result[0].port_name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    scanPorts();
  }, []);

  const handleExecute = async () => {
    clearEvents();
    setRunning(true);
    setError(null);

    addEvent({
      status: 'scanning',
      message: 'Starting amonet exploit...',
      progress: 0,
    });

    try {
      await AmonetApi.execute(
        exploitType,
        selectedPort || undefined,
        115200,
        30000
      );
      addEvent({
        status: 'success',
        message: 'Exploit completed successfully!',
        progress: 1,
      });
      toast.success('Amonet exploit completed!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      addEvent({
        status: 'failed',
        message,
        progress: null,
      });
      toast.error('Exploit failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = async () => {
    try {
      await AmonetApi.cancel();
      setRunning(false);
      addEvent({
        status: 'cancelled',
        message: 'Exploit cancelled by user',
        progress: null,
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-5xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Zap className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Amonet Exploit</h1>
                <p className="text-xs text-muted-foreground">
                  MTK BROM exploit - bypass SLA/DAA authentication
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={scanPorts}
                disabled={isScanning}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                Scan
              </button>
            </div>
          </div>

          {/* Warning */}
          <SpotlightCard>
            <div className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-medium text-warning">Warning</p>
                <p className="mt-1 text-muted-foreground">
                  This tool exploits MediaTek BROM vulnerabilities. Use only on devices you own.
                  Incorrect use may brick your device. Ensure device is in BootROM mode.
                </p>
              </div>
            </div>
          </SpotlightCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Configuration */}
            <SpotlightCard>
              <Panel title="Configuration" accent dot>
                <div className="space-y-4">
                  {/* Port Selection */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Serial Port
                    </label>
                    <select
                      value={selectedPort || ''}
                      onChange={(e) => setSelectedPort(e.target.value || null)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Auto-detect</option>
                      {ports.map((p) => (
                        <option key={p.port_name} value={p.port_name}>
                          {p.port_name} (VID:{p.vid.toString(16)} PID:{p.pid.toString(16)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Exploit Type */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Exploit Type
                    </label>
                    <select
                      value={exploitType}
                      onChange={(e) => setExploitType(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {EXPLOIT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Execute Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleExecute}
                      disabled={isRunning}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-warning/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-warning disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {isRunning ? 'Exploiting...' : 'Execute Exploit'}
                    </button>
                    {isRunning && (
                      <button
                        onClick={handleCancel}
                        className="flex items-center justify-center gap-2 rounded-md border border-error/50 bg-error/10 px-4 py-2.5 text-sm text-error hover:bg-error/20"
                      >
                        <Square className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </Panel>
            </SpotlightCard>

            {/* Event Log */}
            <SpotlightCard>
              <Panel title="Exploit Log" dot>
                <div className="h-64 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
                  {events.length === 0 ? (
                    <p className="text-muted-foreground">No events yet. Click Execute to start.</p>
                  ) : (
                    events.map((event, i) => (
                      <div key={i} className="py-0.5">
                        <span
                          className={
                            event.status === 'success'
                              ? 'text-success'
                              : event.status === 'failed'
                                ? 'text-error'
                                : event.status === 'cancelled'
                                  ? 'text-warning'
                                  : 'text-muted-foreground'
                          }
                        >
                          [{event.status}]
                        </span>{' '}
                        {event.message}
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </SpotlightCard>
          </div>

          {/* Error Display */}
          {error && (
            <SpotlightCard>
              <div className="border border-error/50 bg-error/5 p-4 text-sm text-error">
                {error}
              </div>
            </SpotlightCard>
          )}
        </PageTransition>
      </main>
    </div>
  );
}
