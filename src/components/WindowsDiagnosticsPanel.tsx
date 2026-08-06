import { useState } from 'react';
import { AlertCircle, CheckCircle, Info, Terminal, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../store/deviceStore';
import { useFileSelection } from '../hooks/useFileSelection';
import type { WindowsDiagnostics } from '../types';
import { DiagnosticsApi } from '../services/api/diagnosticsApi';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function WindowsDiagnosticsPanel() {
  const { isConnected, isConnecting } = useDeviceStore();
  const { saveFile } = useFileSelection();
  const [diagnostics, setDiagnostics] = useState<WindowsDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    if (isConnected || isConnecting) {
      setError('Cannot run diagnostics while connected to device. Disconnect first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await DiagnosticsApi.checkWindowsEnvironment();
      setDiagnostics(result);
    } catch (err) {
      const { parseTauriError } = await import('../services/utils/errorParser');
      const parsedError = parseTauriError(err);
      setError(parsedError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearDiagnostics = () => {
    setDiagnostics(null);
    setError(null);
  };

  const exportDiagnostics = async () => {
    const path = await saveFile({
      title: 'Export Diagnostics',
      defaultPath: `penumbra-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`,
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (!path) return;

    setIsExporting(true);
    try {
      await DiagnosticsApi.exportDiagnostics(path);
      toast.success('Diagnostics exported');
    } catch (err) {
      const { parseTauriError } = await import('../services/utils/errorParser');
      const parsedError = parseTauriError(err);
      setError(parsedError.message);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ?
      <CheckCircle className="w-4 h-4 text-success" /> :
      <AlertCircle className="w-4 h-4 text-danger" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-success' : 'text-danger';
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Windows Environment Diagnostics</CardTitle>
            <CardDescription>Check the Windows host environment for antumbra.</CardDescription>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {!diagnostics && !isLoading && (
            <Button onClick={runDiagnostics} size="sm">
              Run Diagnostics
            </Button>
          )}
          {diagnostics && (
            <>
              <Button
                onClick={exportDiagnostics}
                disabled={isExporting}
                variant="outline"
                size="sm"
              >
                <Package className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Zip'}
              </Button>
              <Button onClick={clearDiagnostics} variant="outline" size="sm">
                Clear
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-current"></div>
            <p className="mt-4 text-muted-foreground">Running diagnostics...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-[3px] border border-danger bg-danger-soft p-4">
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Diagnostics Error</span>
            </div>
            <p className="mt-2 text-foreground">{error}</p>
          </div>
        )}

        {diagnostics && !isLoading && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 font-medium text-foreground">System Information</h4>
              <div className="rounded-[3px] bg-surface-alt p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Operating System:</span>
                    <p className="mt-1 font-medium text-foreground">{diagnostics.os_info}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Network Connectivity:</span>
                    <div className="mt-1 flex items-center gap-2">
                      {getStatusIcon(diagnostics.network_connectivity)}
                      <span className={`font-medium ${getStatusColor(diagnostics.network_connectivity)}`}>
                        {diagnostics.network_connectivity ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-foreground">Antumbra Binary</h4>
              <div className="rounded-[3px] bg-surface-alt p-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="mt-1 break-all font-mono text-foreground">
                      {diagnostics.binary_location || 'Not found'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <p className="mt-1 font-medium text-foreground">
                      {diagnostics.binary_version || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Running Processes:</span>
                    <div className="mt-1">
                      {diagnostics.running_antumbra_processes.length > 0 ? (
                        <div className="space-y-1">
                          {diagnostics.running_antumbra_processes.map((process, index) => (
                            <div key={index} className="font-mono text-xs text-warning">
                              PID: {process}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-success">None detected</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-foreground">Configuration</h4>
              <div className="rounded-[3px] bg-surface-alt p-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Config File:</span>
                    <p className="mt-1 break-all font-mono text-foreground">
                      {diagnostics.config_location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Config Exists:</span>
                    {getStatusIcon(diagnostics.config_exists)}
                    <span className={`font-medium ${getStatusColor(diagnostics.config_exists)}`}>
                      {diagnostics.config_exists ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Write Permissions:</span>
                    {getStatusIcon(diagnostics.permissions_ok)}
                    <span className={`font-medium ${getStatusColor(diagnostics.permissions_ok)}`}>
                      {diagnostics.permissions_ok ? 'OK' : 'Issues detected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {diagnostics.recommendations.length > 0 && (
              <div>
                <h4 className="mb-3 font-medium text-foreground">Recommendations</h4>
                <div className="rounded-[3px] border border-warning bg-warning-soft p-4">
                  <div className="space-y-2">
                    {diagnostics.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                        <span className="text-sm text-foreground">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-[3px] border border-border bg-surface-alt p-4">
          <h4 className="mb-2 font-medium text-foreground">Driver Setup Help</h4>
          <p className="text-sm text-muted-foreground">
            MTK devices on Windows need the <span className="font-medium text-foreground">WinUSB</span> or{' '}
            <span className="font-medium text-foreground">LibUSB</span> driver installed for
            preloader/DA communication. Use{' '}
            <a
              href="https://zadig.akeo.ie"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-hover"
            >
              Zadig
            </a>{' '}
            to install the driver for the device interface, then reconnect the device and try again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
