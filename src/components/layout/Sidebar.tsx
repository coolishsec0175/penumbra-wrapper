import { NavLink } from 'react-router-dom';
import {
  FileStack,
  Grid,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Terminal,
  Usb,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '../../store/uiStore';
import { useOperationStore } from '../../store/operationStore';
import { useFlasherStore } from '../../store/flasherStore';
import { useDeviceStore } from '../../store/deviceStore';
import { useDeviceConnection } from '../../hooks/useDeviceConnection';
import { DeviceApi } from '../../services/api/deviceApi';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const APP_VERSION = '1.1.0';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Grid, end: true },
  { to: '/flasher', label: 'Flasher', icon: FileStack, end: false },
  { to: '/tools', label: 'Tools', icon: Wrench, end: false },
  { to: '/log', label: 'Log', icon: Terminal, end: false },
] as const;

function PenumbraLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative size-9 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm',
        className
      )}
    >
      <div className="absolute left-1 top-1 size-6 rounded-full bg-accent" />
      <div className="absolute left-[14px] top-[10px] size-5 rounded-full bg-surface" />
    </div>
  );
}

export function Sidebar() {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const toggleLogPanel = useUIStore((state) => state.toggleLogPanel);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  const daPath = useDeviceStore((state) => state.daPath);
  const isRunning = useOperationStore((state) => state.isRunning);
  const { connect, disconnect, isConnected, isConnecting } = useDeviceConnection();
  const { isFlashing, currentFlashIndex, totalFlashCount, flashModalMinimized, openFlashModal } =
    useFlasherStore();

  const showCancel = isConnecting || isRunning || isFlashing;

  const handlePrimaryAction = () => {
    if (showCancel) {
      DeviceApi.cancelOperation().catch(() => undefined);
      toast('Operation cancelled', { icon: 'ℹ️' });
      return;
    }
    if (isConnected) {
      disconnect();
      toast.success('Device disconnected');
      return;
    }
    if (!daPath) {
      toast.error('Select a DA file in Settings first');
      return;
    }
    void connect();
  };

  const actionLabel = showCancel
    ? 'Cancel'
    : isConnected
      ? 'Disconnect'
      : 'Connect Device';

  return (
    <nav
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface transition-[width] duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border p-4',
          sidebarCollapsed && 'justify-center px-2'
        )}
      >
        <PenumbraLogo />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">Penumbra</h1>
            <p className="truncate text-[11px] text-subtle-foreground">v{APP_VERSION}</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {!sidebarCollapsed && (
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Main
          </p>
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                sidebarCollapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        {isFlashing && flashModalMinimized && (
          <Button
            onClick={openFlashModal}
            variant="warning"
            className={cn('w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
            title="Show flash progress"
          >
            <Zap className="h-5 w-5 shrink-0 animate-pulse" />
            {!sidebarCollapsed && (
              <span className="font-medium">
                Flashing {currentFlashIndex}/{totalFlashCount}
              </span>
            )}
          </Button>
        )}

        <Button
          onClick={handlePrimaryAction}
          variant={isConnected ? 'destructive' : 'default'}
          className={cn('w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
          title={actionLabel}
        >
          {showCancel ? (
            <XCircle className="h-5 w-5 shrink-0" />
          ) : (
            <Usb className="h-5 w-5 shrink-0" />
          )}
          {!sidebarCollapsed && <span className="font-medium">{actionLabel}</span>}
        </Button>

        <div
          className={cn(
            'grid gap-1.5',
            sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-3'
          )}
        >
          <Button onClick={toggleTheme} variant="ghost" size="sm" title="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button onClick={toggleLogPanel} variant="ghost" size="sm" title="Toggle logs">
            <Terminal className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            variant="ghost"
            size="sm"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        <NavLink
          to="/settings"
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
              sidebarCollapsed && 'justify-center px-0',
              isActive
                ? 'bg-primary-soft text-primary'
                : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Settings className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="font-medium">Settings</span>}
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
