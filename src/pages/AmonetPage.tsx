import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Zap, RefreshCw, Play, Square, AlertTriangle, Download } from 'lucide-react';
import { useAmonetStore } from '../store/amonetStore';
import { AmonetApi } from '../services/api/amonetApi';
import { PageTransition } from '../components/ui/PageTransition';
import { Panel } from '../components/penumbra/Panel';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import type { PayloadType } from '../types/amonet';

const PAYLOADS: { type: PayloadType; label: string; description: string; category: string }[] = [
  {
    type: 'brom_defuse',
    label: 'BROM Defuse',
    description: 'Disables SLA/DAA/SBC security checks. For Legacy/V5 devices using kamakiri2.',
    category: 'BROM Exploits',
  },
  {
    type: 'extloader_v5',
    label: 'Extloader V5',
    description: 'Restores boot_to command to V5 DAs. Loads DA extensions.',
    category: 'DA Loaders',
  },
  {
    type: 'extloader_v6_arm',
    label: 'Extloader V6 (ARM32)',
    description: 'DA extension loader for V6 XML devices (ARM32).',
    category: 'DA Loaders',
  },
  {
    type: 'extloader_v6_arm64',
    label: 'Extloader V6 (ARM64)',
    description: 'DA extension loader for V6 XML devices (ARM64).',
    category: 'DA Loaders',
  },
  {
    type: 'hakujoudai_arm',
    label: 'Hakujoudai (ARM32)',
    description: 'V6 heap exploit (heapb8). Enables arbitrary memory read/write.',
    category: 'V6 Exploits',
  },
  {
    type: 'hakujoudai_arm64',
    label: 'Hakujoudai (ARM64)',
    description: 'V6 heap exploit for AArch64. Enables arbitrary memory read/write.',
    category: 'V6 Exploits',
  },
  {
    type: 'sla_xml_arm',
    label: 'SLA XML (ARM32)',
    description: 'SLA bypass for V6 XML devices. Accepts dummy authentication.',
    category: 'SLA Bypass',
  },
  {
    type: 'sla_xml_arm64',
    label: 'SLA XML (ARM64)',
    description: 'SLA bypass for V6 XML devices (ARM64).',
    category: 'SLA Bypass',
  },
];

export function AmonetPage() {
  const {
    ports,
    selectedPort,
    payloadType,
    customPayloadPath,
    baudRate,
    timeoutMs,
    isRunning,
    events,
    error,
    setPorts,
    setSelectedPort,
    setPayloadType,
    setCustomPayloadPath,
    setBaudRate,
    setTimeoutMs,
    setRunning,
    addEvent,
    clearEvents,
    setError,
  } = useAmonetStore();

  const [isScanning, setIsScanning] = useState(false);
  const [showCustomPath, setShowCustomPath] = useState(false);

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
      message: 'Starting exploit...',
      progress: 0,
    });

    try {
      await AmonetApi.execute(
        payloadType,
        selectedPort || undefined,
        baudRate,
        timeoutMs,
        customPayloadPath || undefined
      );
      addEvent({
        status: 'success',
        message: 'Exploit completed successfully!',
        progress: 1,
      });
      toast.success('Exploit completed!');
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
        message: 'Cancelled by user',
        progress: null,
      });
    } catch {
      // ignore
    }
  };

  const groupedPayloads = PAYLOADS.reduce(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {} as Record<string, typeof PAYLOADS>
  );

  const selectedPayload = PAYLOADS.find((p) => p.type === payloadType);

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
                <h1 className="text-lg font-semibold">MTK Exploit</h1>
                <p className="text-xs text-muted-foreground">
                  BROM exploit and payload loader using mtk-payloads
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
              <a
                href="https://github.com/shomykohai/mtk-payloads"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" />
                Get Payloads
              </a>
            </div>
          </div>

          {/* Warning */}
          <SpotlightCard>
            <div className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-medium text-warning">Warning</p>
                <p className="mt-1 text-muted-foreground">
                  This tool exploits MediaTek BootROM vulnerabilities. Use only on devices you own.
                  Incorrect use may brick your device. Ensure device is in BootROM mode.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Download payloads from{' '}
                  <a
                    href="https://github.com/shomykohai/mtk-payloads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-warning underline"
                  >
                    shomykohai/mtk-payloads
                  </a>{' '}
                  and place them in the <code>payloads/</code> directory.
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

                  {/* Payload Type */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Payload
                    </label>
                    <select
                      value={payloadType}
                      onChange={(e) => setPayloadType(e.target.value as PayloadType)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(groupedPayloads).map(([category, items]) => (
                        <optgroup key={category} label={category}>
                          {items.map((p) => (
                            <option key={p.type} value={p.type}>
                              {p.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {selectedPayload && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedPayload.description}
                      </p>
                    )}
                  </div>

                  {/* Custom Payload Path */}
                  <div>
                    <label className="mb-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showCustomPath}
                        onChange={(e) => {
                          setShowCustomPath(e.target.checked);
                          if (!e.target.checked) setCustomPayloadPath(null);
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        Use custom payload file
                      </span>
                    </label>
                    {showCustomPath && (
                      <input
                        type="text"
                        value={customPayloadPath || ''}
                        onChange={(e) => setCustomPayloadPath(e.target.value || null)}
                        placeholder="C:\path\to\payload.bin"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    )}
                  </div>

                  {/* Advanced Settings */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Advanced Settings
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Baud Rate
                          </label>
                          <select
                            value={baudRate}
                            onChange={(e) => setBaudRate(Number(e.target.value))}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value={9600}>9600</option>
                            <option value={19200}>19200</option>
                            <option value={38400}>38400</option>
                            <option value={57600}>57600</option>
                            <option value={115200}>115200</option>
                            <option value={230400}>230400</option>
                            <option value={460800}>460800</option>
                            <option value={921600}>921600</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Timeout (ms)
                          </label>
                          <input
                            type="number"
                            value={timeoutMs}
                            onChange={(e) => setTimeoutMs(Number(e.target.value))}
                            min={5000}
                            max={120000}
                            step={1000}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Execute Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleExecute}
                      disabled={isRunning}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-warning/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-warning disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {isRunning ? 'Running...' : 'Execute'}
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
              <Panel title="Log" dot>
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
              <div className="border border-error/50 bg-error/5 p-4 text-sm text-error">{error}</div>
            </SpotlightCard>
          )}
        </PageTransition>
      </main>
    </div>
  );
}
