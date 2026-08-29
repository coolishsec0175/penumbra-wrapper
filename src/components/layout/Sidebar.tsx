/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileStack,
  Grid,
  Moon,
  Settings,
  Smartphone,
  Sun,
  Terminal,
  Usb,
  Wrench,
  Zap,
} from 'lucide-react';
import { useDeviceStore } from '../../store/deviceStore';
import { useOperationStore } from '../../store/operationStore';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

const APP_VERSION = '1.1.0';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Grid, end: true },
  { to: '/pgpt', label: 'PGPT', icon: FileStack, end: false },
  { to: '/flasher', label: 'Flasher', icon: FileStack, end: false },
  { to: '/tools', label: 'Tools', icon: Wrench, end: false },
  { to: '/mtkclient', label: 'MTKClient', icon: Cpu, end: false },
  { to: '/amonet', label: 'Amonet', icon: Zap, end: false },
  { to: '/adb', label: 'ADB', icon: Smartphone, end: false },
  { to: '/fastboot', label: 'Fastboot', icon: Usb, end: false },
  { to: '/log', label: 'Activity Log', icon: Terminal, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

export function Sidebar() {
  const isConnected = useDeviceStore((state) => state.isConnected);
  const isConnecting = useDeviceStore((state) => state.isConnecting);
  const isRunning = useOperationStore((state) => state.isRunning);
  const operationType = useOperationStore((state) => state.type);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  const [isHovered, setIsHovered] = useState(false);
  const collapsed = sidebarCollapsed;
  const expanded = !collapsed || isHovered;

  const statusLabel = isConnecting
    ? 'Connecting...'
    : isRunning
      ? operationType === 'read'
        ? 'Reading'
        : 'Writing'
      : isConnected
        ? 'Connected'
        : 'Disconnected';

  const statusDot = isConnecting
    ? 'bg-warning'
    : isRunning
      ? 'bg-trace-copper animate-pulse'
      : isConnected
        ? 'bg-success'
        : 'bg-muted-foreground';

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out',
        expanded ? 'w-56' : 'w-[4.5rem]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-14 items-center border-b border-sidebar-border',
        expanded ? 'px-4' : 'justify-center px-2'
      )}>
        {expanded ? (
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-trace-copper">
            PENUMBRA
          </span>
        ) : (
          <span className="text-brand font-display text-lg font-bold">P</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-2 pt-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                !expanded && 'justify-center px-2'
              )
            }
            title={label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {expanded && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Device status + sidebar actions */}
      <div className="flex flex-col gap-2 border-t border-sidebar-border px-2 py-3">
        {/* Device indicator */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors',
            isConnected
              ? 'bg-success/10 text-success'
              : 'bg-muted/50 text-muted-foreground',
            !expanded && 'justify-center px-2'
          )}
          title={statusLabel}
        >
          <Usb className="h-4 w-4 shrink-0" />
          {expanded && <span>{statusLabel}</span>}
          <span className={cn('ml-auto size-1.5 rounded-full', statusDot, !expanded && 'hidden')} />
        </div>

        {/* Sidebar collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0 mx-auto" />
          ) : (
            <Moon className="h-4 w-4 shrink-0 mx-auto" />
          )}
          {expanded && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Version */}
        {expanded && (
          <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
            v{APP_VERSION}
          </span>
        )}
      </div>
    </aside>
  );
}
