import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../store/deviceStore';
import { useOperationStore } from '../store/operationStore';
import { useConfirmation } from '../hooks/useConfirmation';
import { useFileSelection } from '../hooks/useFileSelection';
import { MtkApi } from '../services/api/mtkApi';
import { DeviceApi } from '../services/api/deviceApi';
import { DialogType } from '../services/dialogs/fileDialogService';
import type { MtkDeviceInfo, MtkPartitionInfo, MtkBootCtrl } from '../types';
import { Button } from '../components/ui/button';

export function MtkTools() {
  const { daPath } = useDeviceStore();
  const { addLog } = useOperationStore();
  const { confirm } = useConfirmation();
  const { selectFile, saveFile } = useFileSelection();

  const [serialPort, setSerialPort] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<MtkDeviceInfo | null>(null);
  const [partitions, setPartitions] = useState<MtkPartitionInfo[]>([]);
  const [bootCtrl, setBootCtrl] = useState<MtkBootCtrl | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [peekAddress, setPeekAddress] = useState('');
  const [peekSize, setPeekSize] = useState('256');
  const [peekResult, setPeekResult] = useState<string | null>(null);
  const [pokeAddress, setPokeAddress] = useState('');
  const [pokeValue, setPokeValue] = useState('');
  const [offsetAddress, setOffsetAddress] = useState('');
  const [offsetSize, setOffsetSize] = useState('');
  const [offsetReadOutput, setOffsetReadOutput] = useState<string | null>(null);
  const [offsetWriteInput, setOffsetWriteInput] = useState<string | null>(null);
  const [flashReadSize, setFlashReadSize] = useState('');
  const [flashReadOutput, setFlashReadOutput] = useState<string | null>(null);
  const [flashWriteInput, setFlashWriteInput] = useState<string | null>(null);
  const [rpmbRegion, setRpmbRegion] = useState('1');
  const [rpmbKey, setRpmbKey] = useState('');
  const [rpmbWipeSectors, setRpmbWipeSectors] = useState('4096');
  const [isRunning, setIsRunning] = useState(false);
  const [knownPorts, setKnownPorts] = useState<string[]>([]);

  useEffect(() => {
    MtkApi.listKnownPorts()
      .then(setKnownPorts)
      .catch(() => {});
  }, []);

  const handleConnect = async () => {
    if (!serialPort) {
      toast.error('Please select a serial port');
      return;
    }
    setIsConnecting(true);
    try {
      await MtkApi.connect(serialPort, baudRate);
      setIsConnected(true);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `Connected to ${serialPort}` });
      toast.success('Connected');
    } catch (err) {
      toast.error(`Connection failed: ${err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await MtkApi.disconnect();
      setIsConnected(false);
      setDeviceInfo(null);
      setPartitions([]);
      setBootCtrl(null);
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Disconnected' });
    } catch (err) {
      toast.error(`Disconnect failed: ${err}`);
    }
  };

  const handleGetDeviceInfo = async () => {
    setIsLoading(true);
    try {
      const info = await MtkApi.getDeviceInfo();
      setDeviceInfo(info);
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Device: ${info.chip}` });
    } catch (err) {
      toast.error(`Failed to get device info: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetPartitions = async () => {
    setIsLoading(true);
    try {
      const parts = await MtkApi.getPartitions();
      setPartitions(parts);
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: `Got ${parts.length} partitions` });
    } catch (err) {
      toast.error(`Failed to get partitions: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterDaMode = async () => {
    if (!daPath) {
      toast.error('Please set DA path in settings');
      return;
    }
    setIsLoading(true);
    try {
      await MtkApi.enterDaMode(daPath);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: 'Entered DA mode' });
      toast.success('DA mode activated');
    } catch (err) {
      toast.error(`DA mode failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeek = async () => {
    const addr = parseInt(peekAddress, 16);
    const size = parseInt(peekSize, 10);
    if (isNaN(addr) || isNaN(size)) {
      toast.error('Invalid address or size');
      return;
    }
    try {
      const data = await MtkApi.peek(addr, size);
      const hex = data.map(b => b.toString(16).padStart(2, '0')).join(' ');
      setPeekResult(hex);
    } catch (err) {
      toast.error(`Peek failed: ${err}`);
    }
  };

  const handlePoke = async () => {
    const addr = parseInt(pokeAddress, 16);
    const val = parseInt(pokeValue, 16);
    if (isNaN(addr) || isNaN(val)) {
      toast.error('Invalid address or value');
      return;
    }
    try {
      await MtkApi.poke(addr, val);
      toast.success('Poke succeeded');
    } catch (err) {
      toast.error(`Poke failed: ${err}`);
    }
  };

  const handleGetBootctrl = async () => {
    try {
      const bc = await MtkApi.getBootctrl();
      setBootCtrl(bc);
    } catch (err) {
      toast.error(`Failed to get bootctrl: ${err}`);
    }
  };

  const handleSelectOffsetOutput = async () => {
    const path = await saveFile({
      title: 'Save offset dump',
      defaultPath: `offset_0x${offsetAddress.replace(/^0x/i, '') || '0000'}.bin`,
      filters: [{ name: 'Binary', extensions: ['bin'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (path) setOffsetReadOutput(path);
  };

  const handleSelectOffsetInput = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE);
    if (path) setOffsetWriteInput(path);
  };

  const handleOffsetRead = async () => {
    const addr = parseInt(offsetAddress, 16);
    const size = parseInt(offsetSize, 10);
    if (isNaN(addr) || isNaN(size)) {
      toast.error('Invalid address or size');
      return;
    }
    if (!offsetReadOutput) {
      toast.error('Select an output file first');
      return;
    }
    setIsRunning(true);
    try {
      await MtkApi.readOffset(addr, size, offsetReadOutput);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `Offset read 0x${addr.toString(16)} -> ${offsetReadOutput}` });
      toast.success('Offset read complete');
    } catch (err) {
      toast.error(`Offset read failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleOffsetWrite = async () => {
    const addr = parseInt(offsetAddress, 16);
    if (isNaN(addr)) {
      toast.error('Invalid address');
      return;
    }
    if (!offsetWriteInput) {
      toast.error('Select an input file first');
      return;
    }
    setIsRunning(true);
    try {
      await MtkApi.writeOffset(addr, offsetWriteInput);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `Offset write 0x${addr.toString(16)} <- ${offsetWriteInput}` });
      toast.success('Offset write complete');
    } catch (err) {
      toast.error(`Offset write failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectFlashOutput = async () => {
    const path = await saveFile({
      title: 'Save flash dump',
      defaultPath: 'flash.bin',
      filters: [{ name: 'Binary', extensions: ['bin'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (path) setFlashReadOutput(path);
  };

  const handleSelectFlashInput = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE);
    if (path) setFlashWriteInput(path);
  };

  const handleFlashRead = async () => {
    const size = parseInt(flashReadSize, 10);
    if (isNaN(size) || size <= 0) {
      toast.error('Invalid size');
      return;
    }
    if (!flashReadOutput) {
      toast.error('Select an output file first');
      return;
    }
    setIsRunning(true);
    try {
      await MtkApi.readFlash(size, flashReadOutput);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `Flash read ${size} bytes -> ${flashReadOutput}` });
      toast.success('Flash read complete');
    } catch (err) {
      toast.error(`Flash read failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleFlashWrite = async () => {
    if (!flashWriteInput) {
      toast.error('Select an input file first');
      return;
    }
    const ok = await confirm({
      title: 'Write Flash',
      message: 'This writes the selected image to the raw flash region. Ensure you selected the correct file. Continue?',
      variant: 'danger',
      confirmText: 'Write',
    });
    if (!ok) return;
    setIsRunning(true);
    try {
      await MtkApi.writeFlash(flashWriteInput);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `Flash write <- ${flashWriteInput}` });
      toast.success('Flash write complete');
    } catch (err) {
      toast.error(`Flash write failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleProvisionRpmb = async () => {
    const key = rpmbKey.trim().replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      toast.error('RPMB key must be exactly 64 hex characters (32 bytes)');
      return;
    }
    const ok = await confirm({
      title: 'Provision RPMB Key',
      message: `Provisioning a new RPMB key for region ${rpmbRegion}. This permanently changes the device key and cannot be undone. Continue?`,
      variant: 'danger',
      confirmText: 'Provision',
    });
    if (!ok) return;
    setIsRunning(true);
    try {
      await MtkApi.provisionRpmb(key, rpmbRegion);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `RPMB key provisioned for region ${rpmbRegion}` });
      toast.success('RPMB key provisioned');
    } catch (err) {
      toast.error(`RPMB provision failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleWipeRpmb = async () => {
    const sectors = parseInt(rpmbWipeSectors, 10);
    if (isNaN(sectors) || sectors <= 0) {
      toast.error('Invalid sector count');
      return;
    }
    const ok = await confirm({
      title: 'Wipe RPMB',
      message: `Zero-fill ${sectors} sectors of RPMB region ${rpmbRegion}. This erases all RPMB contents. Continue?`,
      variant: 'danger',
      confirmText: 'Wipe',
    });
    if (!ok) return;
    setIsRunning(true);
    try {
      await MtkApi.wipeRpmb(rpmbRegion, sectors);
      addLog({ timestamp: new Date().toISOString(), level: 'success', message: `RPMB region ${rpmbRegion} wiped (${sectors} sectors)` });
      toast.success('RPMB wiped');
    } catch (err) {
      toast.error(`RPMB wipe failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCrash = async () => {
    if (!daPath) {
      toast.error('Please set DA path in settings');
      return;
    }
    const ok = await confirm({
      title: 'Send Crash Command',
      message: 'This sends the debug crash command to antumbra, intentionally crashing the DA for testing. Continue?',
      variant: 'danger',
      confirmText: 'Crash',
    });
    if (!ok) return;
    setIsRunning(true);
    try {
      await DeviceApi.crash(daPath);
      addLog({ timestamp: new Date().toISOString(), level: 'warning', message: 'Crash command sent' });
      toast.success('Crash command sent');
    } catch (err) {
      toast.error(`Crash command failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <h2 className="text-xl font-bold">MTK Native Tools</h2>

        {/* Connection Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">Connection</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="bg-surface-alt border border-border rounded px-3 py-2 text-sm min-w-[200px]"
              value={serialPort}
              onChange={e => setSerialPort(e.target.value)}
              disabled={isConnected}
            >
              <option value="">Select port...</option>
              {knownPorts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="number"
              className="bg-surface-alt border border-border rounded px-3 py-2 text-sm w-28"
              placeholder="Baud rate"
              value={baudRate}
              onChange={e => setBaudRate(Number(e.target.value))}
              disabled={isConnected}
            />
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <Button onClick={handleDisconnect} variant="destructive">
                Disconnect
              </Button>
            )}
          </div>
          {isConnected && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-500">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          )}
        </section>

        {/* Device Info Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">Device Info</h3>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleGetDeviceInfo} disabled={!isConnected || isLoading}>Get Info</Button>
            <Button onClick={handleGetPartitions} disabled={!isConnected || isLoading}>Get Partitions</Button>
            <Button onClick={handleEnterDaMode} disabled={!isConnected || isLoading || !daPath}>Enter DA Mode</Button>
            <Button onClick={handleGetBootctrl} disabled={!isConnected || isLoading}>Get Boot Control</Button>
          </div>
          {deviceInfo && (
            <pre className="bg-surface-alt rounded p-3 text-xs overflow-x-auto">
              {JSON.stringify(deviceInfo, null, 2)}
            </pre>
          )}
          {bootCtrl && (
            <pre className="bg-surface-alt rounded p-3 text-xs overflow-x-auto">
              {JSON.stringify(bootCtrl, null, 2)}
            </pre>
          )}
        </section>

        {/* Partitions Section */}
        {partitions.length > 0 && (
          <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <h3 className="font-semibold text-lg">Partitions ({partitions.length})</h3>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 pr-4">Index</th>
                    <th className="text-left py-2 pr-4">Start</th>
                    <th className="text-left py-2 pr-4">Size</th>
                    <th className="text-left py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {partitions.map(p => (
                    <tr key={p.name} className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono text-xs">{p.name}</td>
                      <td className="py-1.5 pr-4">{p.index}</td>
                      <td className="py-1.5 pr-4 font-mono text-xs">{p.start_address}</td>
                      <td className="py-1.5 pr-4 font-mono text-xs">{p.length}</td>
                      <td className="py-1.5 font-mono text-xs">{p.partition_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Memory Operations Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">Memory Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Peek */}
            <div className="space-y-2 p-3 bg-surface-alt rounded">
              <h4 className="font-medium text-sm">Peek (read memory)</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono w-28"
                  placeholder="Address (hex)"
                  value={peekAddress}
                  onChange={e => setPeekAddress(e.target.value)}
                />
                <input
                  type="number"
                  className="bg-background border border-border rounded px-2 py-1.5 text-xs w-20"
                  placeholder="Size"
                  value={peekSize}
                  onChange={e => setPeekSize(e.target.value)}
                />
                <Button size="sm" onClick={handlePeek} disabled={!isConnected}>Peek</Button>
              </div>
              {peekResult && (
                <pre className="bg-background rounded p-2 text-xs overflow-x-auto max-h-32 mt-2">{peekResult}</pre>
              )}
            </div>

            {/* Poke */}
            <div className="space-y-2 p-3 bg-surface-alt rounded">
              <h4 className="font-medium text-sm">Poke (write memory)</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono w-28"
                  placeholder="Address (hex)"
                  value={pokeAddress}
                  onChange={e => setPokeAddress(e.target.value)}
                />
                <input
                  type="text"
                  className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono w-28"
                  placeholder="Value (hex)"
                  value={pokeValue}
                  onChange={e => setPokeValue(e.target.value)}
                />
                <Button size="sm" onClick={handlePoke} disabled={!isConnected}>Poke</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Offset Read/Write Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">Offset Read/Write (DA Mode)</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs font-mono w-28"
              placeholder="Address (hex)"
              value={offsetAddress}
              onChange={e => setOffsetAddress(e.target.value)}
            />
            <input
              type="text"
              className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs w-20"
              placeholder="Size"
              value={offsetSize}
              onChange={e => setOffsetSize(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Read to:</span>
              <span className="text-xs font-mono bg-background rounded px-2 py-1 max-w-[220px] truncate">
                {offsetReadOutput || 'no file selected'}
              </span>
              <Button size="sm" variant="outline" onClick={handleSelectOffsetOutput} disabled={isRunning}>Browse</Button>
              <Button size="sm" onClick={handleOffsetRead} disabled={!isConnected || isRunning}>Read Offset</Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Write from:</span>
              <span className="text-xs font-mono bg-background rounded px-2 py-1 max-w-[220px] truncate">
                {offsetWriteInput || 'no file selected'}
              </span>
              <Button size="sm" variant="outline" onClick={handleSelectOffsetInput} disabled={isRunning}>Browse</Button>
              <Button size="sm" onClick={handleOffsetWrite} disabled={!isConnected || isRunning}>Write Offset</Button>
            </div>
          </div>
        </section>

        {/* Raw Flash Read/Write Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">Raw Flash Read/Write</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs w-24"
              placeholder="Size"
              value={flashReadSize}
              onChange={e => setFlashReadSize(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">Read to:</span>
            <span className="text-xs font-mono bg-background rounded px-2 py-1 max-w-[220px] truncate">
              {flashReadOutput || 'no file selected'}
            </span>
            <Button size="sm" variant="outline" onClick={handleSelectFlashOutput} disabled={isRunning}>Browse</Button>
            <Button size="sm" onClick={handleFlashRead} disabled={!isConnected || isRunning}>Read Flash</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Write from:</span>
            <span className="text-xs font-mono bg-background rounded px-2 py-1 max-w-[220px] truncate">
              {flashWriteInput || 'no file selected'}
            </span>
            <Button size="sm" variant="outline" onClick={handleSelectFlashInput} disabled={isRunning}>Browse</Button>
            <Button size="sm" onClick={handleFlashWrite} disabled={!isConnected || isRunning}>Write Flash</Button>
          </div>
        </section>

        {/* RPMB Operations Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">RPMB Operations</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs w-16"
              placeholder="Region"
              value={rpmbRegion}
              onChange={e => setRpmbRegion(e.target.value)}
            />
            <input
              type="text"
              className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs font-mono flex-1 min-w-[280px]"
              placeholder="Key (64 hex chars)"
              value={rpmbKey}
              onChange={e => setRpmbKey(e.target.value)}
            />
            <Button size="sm" onClick={handleProvisionRpmb} disabled={!isConnected || isRunning}>Provision Key</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="bg-surface-alt border border-border rounded px-2 py-1.5 text-xs w-24"
              placeholder="Sectors"
              value={rpmbWipeSectors}
              onChange={e => setRpmbWipeSectors(e.target.value)}
            />
            <Button size="sm" onClick={handleWipeRpmb} disabled={!isConnected || isRunning}>Wipe RPMB</Button>
          </div>
        </section>

        {/* Debug Section */}
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-semibold text-lg">Debug</h3>
          <Button size="sm" onClick={handleCrash} disabled={!daPath || isRunning}>Send Crash Command</Button>
        </section>
      </main>
    </div>
  );
}
