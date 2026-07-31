import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../store/deviceStore';
import { useOperationStore } from '../store/operationStore';
import { MtkApi } from '../services/api/mtkApi';
import type { MtkDeviceInfo, MtkPartitionInfo, MtkBootCtrl } from '../types';
import { Button } from '../components/ui/button';

export function MtkTools() {
  const { daPath } = useDeviceStore();
  const { addLog } = useOperationStore();

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
            <span className="text-xs text-muted-foreground">(Use Tools page for file-based operations)</span>
          </div>
        </section>
      </main>
    </div>
  );
}
