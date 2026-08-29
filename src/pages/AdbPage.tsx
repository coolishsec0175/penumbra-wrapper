import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Smartphone, RefreshCw, Terminal, ArrowDownToLine, ArrowUpFromLine, RotateCcw } from 'lucide-react';
import { useAdbStore } from '../store/adbStore';
import { AdbApi } from '../services/api/adbApi';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { PageTransition } from '../components/ui/PageTransition';
import { Panel } from '../components/penumbra/Panel';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';

export function AdbPage() {
  const { devices, selectedDevice, setDevices, setSelectedDevice, setError } =
    useAdbStore();
  const { selectFile } = useFileSelection();

  const [shellCommand, setShellCommand] = useState('');
  const [shellOutput, setShellOutput] = useState('');
  const [deviceProps, setDeviceProps] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDevices = async () => {
    setIsRefreshing(true);
    try {
      const result = await AdbApi.listDevices();
      setDevices(result);
      if (result.length > 0 && !selectedDevice) {
        setSelectedDevice(result[0].serial);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  const handleRefreshProps = async () => {
    if (!selectedDevice) return;
    try {
      const props = await AdbApi.getDeviceProps(selectedDevice);
      setDeviceProps(props);
      toast.success('Device properties loaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleShellCommand = async () => {
    if (!selectedDevice || !shellCommand.trim()) return;
    try {
      const result = await AdbApi.shellCommand(selectedDevice, shellCommand);
      setShellOutput(result.stdout || result.stderr);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setShellOutput(`Error: ${message}`);
    }
  };

  const handlePush = async () => {
    if (!selectedDevice) return;
    const localPath = await selectFile(DialogType.SINGLE_FILE);
    if (!localPath) return;

    const remotePath = `/sdcard/${localPath.split(/[\\/]/).pop()}`;
    try {
      await AdbApi.push(selectedDevice, localPath, remotePath);
      toast.success(`Pushed to ${remotePath}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handlePull = async () => {
    if (!selectedDevice) return;
    const remotePath = prompt('Remote path to pull:');
    if (!remotePath) return;

    const localPath = await selectFile(DialogType.OUTPUT_FOLDER);
    if (!localPath) return;

    try {
      await AdbApi.pull(selectedDevice, remotePath, localPath);
      toast.success('File pulled successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const handleReboot = async (mode: string) => {
    if (!selectedDevice) return;
    try {
      await AdbApi.reboot(selectedDevice, mode);
      toast.success(`Rebooting to ${mode}...`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const selectedDeviceInfo = devices.find((d) => d.serial === selectedDevice);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-5xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Smartphone className="h-5 w-5 text-success" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">ADB</h1>
                <p className="text-xs text-muted-foreground">
                  Android Debug Bridge - device management and shell
                </p>
              </div>
            </div>
            <button
              onClick={refreshDevices}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Device Info */}
          <SpotlightCard>
            <Panel title="Device" accent dot={false} padded={false}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      selectedDevice ? 'bg-success' : 'bg-muted-foreground'
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {selectedDeviceInfo
                      ? `${selectedDeviceInfo.serial} (${selectedDeviceInfo.state})`
                      : 'No device connected'}
                  </span>
                </div>
                <select
                  value={selectedDevice || ''}
                  onChange={(e) => setSelectedDevice(e.target.value || null)}
                  className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">Select device...</option>
                  {devices.map((d) => (
                    <option key={d.serial} value={d.serial}>
                      {d.serial} ({d.state})
                    </option>
                  ))}
                </select>
              </div>
            </Panel>
          </SpotlightCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Shell */}
            <SpotlightCard>
              <Panel title="Shell" accent dot>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shellCommand}
                      onChange={(e) => setShellCommand(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleShellCommand()}
                      placeholder="Enter shell command..."
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
                      disabled={!selectedDevice}
                    />
                    <button
                      onClick={handleShellCommand}
                      disabled={!selectedDevice || !shellCommand.trim()}
                      className="flex items-center gap-2 rounded-md bg-trace-copper px-4 py-2 text-sm font-medium text-white hover:bg-trace-copper/80 disabled:opacity-50"
                    >
                      <Terminal className="h-4 w-4" />
                      Run
                    </button>
                  </div>
                  <div className="h-40 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
                    {shellOutput || <span className="text-muted-foreground">Shell output...</span>}
                  </div>
                </div>
              </Panel>
            </SpotlightCard>

            {/* File Transfer */}
            <SpotlightCard>
              <Panel title="File Transfer" accent dot>
                <div className="space-y-3">
                  <button
                    onClick={handlePush}
                    disabled={!selectedDevice}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <ArrowUpFromLine className="h-4 w-4" />
                    Push File to Device
                  </button>
                  <button
                    onClick={handlePull}
                    disabled={!selectedDevice}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Pull File from Device
                  </button>
                </div>
              </Panel>
            </SpotlightCard>

            {/* Reboot */}
            <SpotlightCard>
              <Panel title="Reboot" accent dot>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleReboot('normal')}
                    disabled={!selectedDevice}
                    className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reboot
                  </button>
                  <button
                    onClick={() => handleReboot('bootloader')}
                    disabled={!selectedDevice}
                    className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Bootloader
                  </button>
                  <button
                    onClick={() => handleReboot('recovery')}
                    disabled={!selectedDevice}
                    className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Recovery
                  </button>
                  <button
                    onClick={handleRefreshProps}
                    disabled={!selectedDevice}
                    className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Device Info
                  </button>
                </div>
              </Panel>
            </SpotlightCard>

            {/* Device Properties */}
            <SpotlightCard>
              <Panel title="Device Properties" dot>
                <div className="h-48 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
                  {Object.keys(deviceProps).length === 0 ? (
                    <span className="text-muted-foreground">
                      Click &quot;Device Info&quot; to load properties
                    </span>
                  ) : (
                    Object.entries(deviceProps).map(([key, value]) => (
                      <div key={key} className="py-0.5">
                        <span className="text-trace-copper">{key}:</span>{' '}
                        <span>{value}</span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </SpotlightCard>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
