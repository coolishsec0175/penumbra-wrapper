import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Smartphone, RefreshCw, Terminal, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Usb, Upload, Lock, Unlock, Info } from 'lucide-react';
import { useAdbStore } from '../store/adbStore';
import { useFastbootNativeStore } from '../store/fastbootNativeStore';
import { AdbApi } from '../services/api/adbApi';
import { FastbootNativeApi } from '../services/api/fastbootNativeApi';
import { useFileSelection } from '../hooks/useFileSelection';
import { useConfirmation } from '../hooks/useConfirmation';
import { DialogType } from '../services/dialogs/fileDialogService';
import { Tabs } from '../components/ui/Tabs';
import { PageTransition } from '../components/ui/PageTransition';
import { Panel } from '../components/penumbra/Panel';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';

const DEVICE_TABS = [
  { id: 'adb', label: 'ADB' },
  { id: 'fastboot', label: 'Fastboot' },
] as const;

const FASTBOOT_FLASH_PARTITIONS = [
  'boot', 'recovery', 'system', 'vendor', 'product',
  'super', 'vbmeta', 'vbmeta_system', 'dtbo',
];

export function Device() {
  const [activeTab, setActiveTab] = useState('adb');

  // ── ADB state ──
  const { devices, selectedDevice, setDevices, setSelectedDevice, setError } = useAdbStore();
  const [shellCommand, setShellCommand] = useState('');
  const [shellOutput, setShellOutput] = useState('');
  const [deviceProps, setDeviceProps] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fastboot state ──
  const { devices: fbDevices, variables, setDevices: setFbDevices, setVariables, setError: setFbError } = useFastbootNativeStore();
  const [selectedPartition, setSelectedPartition] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { selectFile } = useFileSelection();
  const { confirm } = useConfirmation();

  // ── ADB handlers ──
  const refreshAdbDevices = async () => {
    setIsRefreshing(true);
    try {
      const result = await AdbApi.listDevices();
      setDevices(result);
      if (result.length > 0 && !selectedDevice) setSelectedDevice(result[0].serial);
    } catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); setError(message); }
    finally { setIsRefreshing(false); }
  };

  useEffect(() => { if (activeTab === 'adb') refreshAdbDevices(); }, [activeTab]);

  const handleRefreshProps = async () => {
    if (!selectedDevice) return;
    try { const props = await AdbApi.getDeviceProps(selectedDevice); setDeviceProps(props); toast.success('Device properties loaded'); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleShellCommand = async () => {
    if (!selectedDevice || !shellCommand.trim()) return;
    try { const result = await AdbApi.shellCommand(selectedDevice, shellCommand); setShellOutput(result.stdout || result.stderr); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); setShellOutput(`Error: ${message}`); }
  };

  const handlePush = async () => {
    if (!selectedDevice) return;
    const localPath = await selectFile(DialogType.SINGLE_FILE);
    if (!localPath) return;
    const remotePath = `/sdcard/${localPath.split(/[\\/]/).pop()}`;
    try { await AdbApi.push(selectedDevice, localPath, remotePath); toast.success(`Pushed to ${remotePath}`); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handlePull = async () => {
    if (!selectedDevice) return;
    const remotePath = prompt('Remote path to pull:');
    if (!remotePath) return;
    const localPath = await selectFile(DialogType.OUTPUT_FOLDER);
    if (!localPath) return;
    try { await AdbApi.pull(selectedDevice, remotePath, localPath); toast.success('File pulled successfully'); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleAdbReboot = async (mode: string) => {
    if (!selectedDevice) return;
    try { await AdbApi.reboot(selectedDevice, mode); toast.success(`Rebooting to ${mode}...`); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const selectedDeviceInfo = devices.find((d) => d.serial === selectedDevice);

  // ── Fastboot handlers ──
  const refreshFastbootDevices = async () => {
    setIsRefreshing(true);
    try { const result = await FastbootNativeApi.scanDevices(); setFbDevices(result); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); setFbError(message); }
    finally { setIsRefreshing(false); }
  };

  const refreshVars = async () => {
    try { const result = await FastbootNativeApi.getAllVars(); setVariables(result); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  useEffect(() => { if (activeTab === 'fastboot') refreshFastbootDevices(); }, [activeTab]);

  const handleSelectFile = async () => { const file = await selectFile(DialogType.IMAGE_FILE); if (file) setSelectedFile(file); };

  const handleFbFlash = async () => {
    if (!selectedPartition || !selectedFile) return;
    const confirmed = await confirm({ title: 'Flash Partition', message: `Flash "${selectedFile}" to "${selectedPartition}"?`, variant: 'danger', confirmText: 'Flash', countdownSeconds: 5 });
    if (!confirmed) return;
    try {
      const result = await FastbootNativeApi.flash(selectedPartition, selectedFile);
      result.success ? toast.success(`Flashed ${selectedPartition} successfully`) : toast.error(result.message);
    } catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleFbErase = async (partition: string) => {
    const confirmed = await confirm({ title: 'Erase Partition', message: `Erase "${partition}"? This will destroy all data.`, variant: 'danger', confirmText: 'Erase', countdownSeconds: 5 });
    if (!confirmed) return;
    try { await FastbootNativeApi.erase(partition); toast.success(`Erased ${partition}`); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleFbBoot = async () => {
    const file = await selectFile(DialogType.IMAGE_FILE);
    if (!file) return;
    try { await FastbootNativeApi.boot(file); toast.success('Booting image...'); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleFbReboot = async (mode: string) => {
    try { await FastbootNativeApi.reboot(mode); toast.success(`Rebooting to ${mode}...`); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleOemUnlock = async () => {
    const confirmed = await confirm({ title: 'Unlock Bootloader', message: 'WARNING: Unlocking may WIPE ALL DATA. Continue?', variant: 'danger', confirmText: 'Unlock', countdownSeconds: 15 });
    if (!confirmed) return;
    try { await FastbootNativeApi.oemUnlock(); toast.success('Bootloader unlock command sent'); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  const handleOemLock = async () => {
    const confirmed = await confirm({ title: 'Lock Bootloader', message: 'Lock the bootloader?', variant: 'warning', confirmText: 'Lock' });
    if (!confirmed) return;
    try { await FastbootNativeApi.oemLock(); toast.success('Bootloader lock command sent'); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : String(err); toast.error(message); }
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-5xl space-y-4">
          <Tabs tabs={[...DEVICE_TABS]} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* ══════════ ADB TAB ══════════ */}
          {activeTab === 'adb' && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <Smartphone className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">ADB</h1>
                    <p className="text-xs text-muted-foreground">Android Debug Bridge - device management and shell</p>
                  </div>
                </div>
                <button onClick={refreshAdbDevices} disabled={isRefreshing} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              <SpotlightCard>
                <Panel title="Device" accent dot={false} padded={false}>
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${selectedDevice ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <span className="text-sm font-medium">{selectedDeviceInfo ? `${selectedDeviceInfo.serial} (${selectedDeviceInfo.state})` : 'No device connected'}</span>
                    </div>
                    <select value={selectedDevice || ''} onChange={(e) => setSelectedDevice(e.target.value || null)} className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                      <option value="">Select device...</option>
                      {devices.map((d) => <option key={d.serial} value={d.serial}>{d.serial} ({d.state})</option>)}
                    </select>
                  </div>
                </Panel>
              </SpotlightCard>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SpotlightCard>
                  <Panel title="Shell" accent dot>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="text" value={shellCommand} onChange={(e) => setShellCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleShellCommand()} placeholder="Enter shell command..." className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" disabled={!selectedDevice} />
                        <button onClick={handleShellCommand} disabled={!selectedDevice || !shellCommand.trim()} className="flex items-center gap-2 rounded-md bg-trace-copper px-4 py-2 text-sm font-medium text-white hover:bg-trace-copper/80 disabled:opacity-50">
                          <Terminal className="h-4 w-4" /> Run
                        </button>
                      </div>
                      <div className="h-40 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
                        {shellOutput || <span className="text-muted-foreground">Shell output...</span>}
                      </div>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard>
                  <Panel title="File Transfer" accent dot>
                    <div className="space-y-3">
                      <button onClick={handlePush} disabled={!selectedDevice} className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50">
                        <ArrowUpFromLine className="h-4 w-4" /> Push File to Device
                      </button>
                      <button onClick={handlePull} disabled={!selectedDevice} className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50">
                        <ArrowDownToLine className="h-4 w-4" /> Pull File from Device
                      </button>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard>
                  <Panel title="Reboot" accent dot>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleAdbReboot('normal')} disabled={!selectedDevice} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                        <RotateCcw className="h-4 w-4" /> Reboot
                      </button>
                      <button onClick={() => handleAdbReboot('bootloader')} disabled={!selectedDevice} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                        <RotateCcw className="h-4 w-4" /> Bootloader
                      </button>
                      <button onClick={() => handleAdbReboot('recovery')} disabled={!selectedDevice} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                        <RotateCcw className="h-4 w-4" /> Recovery
                      </button>
                      <button onClick={handleRefreshProps} disabled={!selectedDevice} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                        <RefreshCw className="h-4 w-4" /> Device Info
                      </button>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard>
                  <Panel title="Device Properties" dot>
                    <div className="h-48 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
                      {Object.keys(deviceProps).length === 0 ? (
                        <span className="text-muted-foreground">Click &quot;Device Info&quot; to load properties</span>
                      ) : (
                        Object.entries(deviceProps).map(([key, value]) => (
                          <div key={key} className="py-0.5"><span className="text-trace-copper">{key}:</span> <span>{value}</span></div>
                        ))
                      )}
                    </div>
                  </Panel>
                </SpotlightCard>
              </div>
            </>
          )}

          {/* ══════════ FASTBOOT TAB ══════════ */}
          {activeTab === 'fastboot' && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                    <Usb className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Fastboot</h1>
                    <p className="text-xs text-muted-foreground">Fastboot protocol - flash, boot, and manage bootloader</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={refreshVars} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent">
                    <Info className="h-4 w-4" /> Device Vars
                  </button>
                  <button onClick={refreshFastbootDevices} disabled={isRefreshing} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
              </div>

              <SpotlightCard>
                <Panel title="Device" accent dot={false} padded={false}>
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${fbDevices.length > 0 ? 'bg-success' : 'bg-muted-foreground'}`} />
                      <span className="text-sm font-medium">{fbDevices.length > 0 ? `${fbDevices[0].serial} ${fbDevices[0].is_unlocked ? '(Unlocked)' : '(Locked)'}` : 'No device detected'}</span>
                    </div>
                  </div>
                </Panel>
              </SpotlightCard>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SpotlightCard>
                  <Panel title="Flash Partition" accent dot>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Partition</label>
                        <select value={selectedPartition} onChange={(e) => setSelectedPartition(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                          <option value="">Select partition...</option>
                          {FASTBOOT_FLASH_PARTITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Image File</label>
                        <div className="flex gap-2">
                          <input type="text" value={selectedFile || ''} readOnly placeholder="Select image file..." className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
                          <button onClick={handleSelectFile} className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent">Browse</button>
                        </div>
                      </div>
                      <button onClick={handleFbFlash} disabled={!selectedPartition || !selectedFile} className="flex w-full items-center justify-center gap-2 rounded-md bg-trace-copper px-4 py-2 text-sm font-medium text-white hover:bg-trace-copper/80 disabled:opacity-50">
                        <Upload className="h-4 w-4" /> Flash
                      </button>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard>
                  <Panel title="Boot & Reboot" accent dot>
                    <div className="space-y-3">
                      <button onClick={handleFbBoot} className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent">
                        <Upload className="h-4 w-4" /> Boot Image
                      </button>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleFbReboot('normal')} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent">
                          <RotateCcw className="h-4 w-4" /> Reboot
                        </button>
                        <button onClick={() => handleFbReboot('bootloader')} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent">
                          <RotateCcw className="h-4 w-4" /> Bootloader
                        </button>
                        <button onClick={() => handleFbReboot('recovery')} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent">
                          <RotateCcw className="h-4 w-4" /> Recovery
                        </button>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Erase Partition</label>
                        <div className="flex gap-2">
                          <select value={selectedPartition} onChange={(e) => setSelectedPartition(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
                            <option value="">Select partition...</option>
                            {FASTBOOT_FLASH_PARTITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <button onClick={() => handleFbErase(selectedPartition)} disabled={!selectedPartition} className="flex items-center justify-center gap-2 rounded-md border border-error/50 bg-error/10 px-3 py-2 text-sm text-error hover:bg-error/20 disabled:opacity-50">
                            Erase
                          </button>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard>
                  <Panel title="Bootloader" accent dot>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={handleOemUnlock} className="flex items-center justify-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-warning hover:bg-warning/20">
                        <Unlock className="h-4 w-4" /> Unlock
                      </button>
                      <button onClick={handleOemLock} className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-sm hover:bg-accent">
                        <Lock className="h-4 w-4" /> Lock
                      </button>
                    </div>
                  </Panel>
                </SpotlightCard>

                <SpotlightCard>
                  <Panel title="Device Variables" dot>
                    <div className="h-48 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
                      {variables.length === 0 ? (
                        <span className="text-muted-foreground">Click &quot;Device Vars&quot; to load</span>
                      ) : (
                        variables.map((v) => <div key={v.name} className="py-0.5"><span className="text-trace-copper">{v.name}:</span> <span>{v.value}</span></div>)
                      )}
                    </div>
                  </Panel>
                </SpotlightCard>
              </div>
            </>
          )}
        </PageTransition>
      </main>
    </div>
  );
}
