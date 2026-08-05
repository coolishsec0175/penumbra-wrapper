import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Power, RotateCw, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../../store/deviceStore';
import { useOperationStore } from '../../store/operationStore';
import { useUIStore } from '../../store/uiStore';
import { useDeviceConnection } from '../../hooks/useDeviceConnection';
import { useConfirmation } from '../../hooks/useConfirmation';
import { DeviceApi } from '../../services/api/deviceApi';
import { ErrorHandler } from '../../services/utils/errorHandler';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/': 'PGPT Manager',
  '/flasher': 'Flash Partitions',
  '/tools': 'Tools',
  '/log': 'Log Workspace',
  '/settings': 'Settings',
};

const REBOOT_MODES = [
  { key: 'normal', label: 'Normal' },
  { key: 'home-screen', label: 'Home Screen' },
  { key: 'fastboot', label: 'Fastboot' },
  { key: 'meta', label: 'Meta' },
  { key: 'test', label: 'Test' },
] as const;

type RebootMode = (typeof REBOOT_MODES)[number]['key'];

export function PageHeader() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'Penumbra';

  const daPath = useDeviceStore((state) => state.daPath);
  const preloaderPath = useDeviceStore((state) => state.preloaderPath);
  const isRunning = useOperationStore((state) => state.isRunning);
  const operationType = useOperationStore((state) => state.type);
  const toggleLogPanel = useUIStore((state) => state.toggleLogPanel);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const { isConnected, isConnecting } = useDeviceConnection();
  const { confirm } = useConfirmation();

  const [rebootOpen, setRebootOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRebootOpen(false);
      }
    };
    if (rebootOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [rebootOpen]);

  const handleReboot = async (mode: RebootMode) => {
    if (!daPath || !isConnected) return;
    setRebootOpen(false);
    try {
      await DeviceApi.reboot(daPath, mode, preloaderPath || undefined);
      toast.success(`Device rebooting to ${mode} mode`);
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Reboot');
    }
  };

  const handleShutdown = async () => {
    if (!daPath || !isConnected) return;
    setRebootOpen(false);
    const confirmed = await confirm({
      title: 'Shutdown Device',
      message: 'Are you sure you want to shut down the device?',
      variant: 'warning',
      confirmText: 'Shutdown',
    });
    if (!confirmed) {
      toast('Shutdown cancelled', { icon: 'ℹ️' });
      return;
    }
    try {
      await DeviceApi.shutdown(daPath, preloaderPath || undefined);
      toast.success('Device shutting down');
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Shutdown');
    }
  };

  const statusLabel = isConnecting
    ? 'Connecting...'
    : isRunning
      ? operationType === 'read'
        ? 'Reading'
        : 'Writing'
      : isConnected
        ? 'Connected'
        : 'Disconnected';

  const dotColor = isConnecting
    ? 'bg-warning'
    : isRunning
      ? 'bg-accent'
      : isConnected
        ? 'bg-success'
        : 'bg-muted-foreground';

  return (
    <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
      <h1 className="truncate text-[22px] font-bold text-foreground">{title}</h1>

      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 rounded-[3px] border border-border bg-surface px-2.5 py-1.5">
          <span className={cn('size-2 rounded-full', dotColor)} />
          <span className="text-xs font-semibold text-foreground">
            {statusLabel}
          </span>
        </div>

        <Button
          onClick={toggleLogPanel}
          variant="ghost"
          size="icon"
          title="Toggle operation logs"
        >
          <Terminal className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          variant="ghost"
          size="icon"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setRebootOpen(!rebootOpen)}
            disabled={!isConnected || isConnecting}
            variant="outline"
            size="sm"
            className="text-[11px] font-semibold uppercase"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Reboot
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          {rebootOpen && (
            <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg">
              {REBOOT_MODES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleReboot(key)}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  {label}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleShutdown}
                className="w-full rounded-md px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-surface-hover"
              >
                Shutdown
              </button>
            </div>
          )}
        </div>

        <Button
          onClick={handleShutdown}
          disabled={!isConnected || isConnecting}
          variant="outline"
          size="sm"
          className="text-[11px] font-semibold uppercase"
          title="Shut down device"
        >
          <Power className="h-3.5 w-3.5 text-danger" />
          Shutdown
        </Button>
      </div>
    </header>
  );
}
