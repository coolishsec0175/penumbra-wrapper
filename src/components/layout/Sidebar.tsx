/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { NavLink } from 'react-router-dom';
import {
  FileStack,
  Grid,
  Settings,
  Terminal,
  Usb,
  Wrench,
} from 'lucide-react';
import { useDeviceStore } from '../../store/deviceStore';
import { useOperationStore } from '../../store/operationStore';
import { cn } from '../../lib/utils';

const APP_VERSION = '1.1.0';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Grid, end: true },
  { to: '/pgpt', label: 'PGPT', icon: FileStack, end: false },
  { to: '/flasher', label: 'Flasher', icon: FileStack, end: false },
  { to: '/tools', label: 'Tools', icon: Wrench, end: false },
  { to: '/log', label: 'Activity Log', icon: Terminal, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

export function Sidebar() {
  const isConnected = useDeviceStore((state) => state.isConnected);
  const isConnecting = useDeviceStore((state) => state.isConnecting);
  const isRunning = useOperationStore((state) => state.isRunning);
  const operationType = useOperationStore((state) => state.type);

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
      ? 'bg-accent animate-pulse'
      : isConnected
        ? 'bg-success'
        : 'bg-muted-foreground';

  return (
    <aside className="flex h-full w-[68px] flex-col border-r border-border bg-surface/80 backdrop-blur-md">
      {/* Logo */}
      <div className="flex h-14 items-center justify-center border-b border-border">
        <span className="relative flex size-8 items-center justify-center rounded-lg border border-accent/40 bg-accent-soft">
          <span className="caret !h-3.5 !w-[7px]" />
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col items-center gap-1 px-2 pt-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition-all',
                isActive
                  ? 'bg-primary-soft text-accent nav-glow'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              )
            }
            title={label}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Device status */}
      <div className="flex flex-col items-center gap-2 border-t border-border px-2 py-3">
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-lg border transition-colors',
            isConnected
              ? 'border-success/40 bg-success-soft text-success'
              : 'border-border bg-surface-alt text-muted-foreground'
          )}
          title={statusLabel}
        >
          <Usb className="h-4 w-4" />
        </div>
        <span className="flex items-center gap-1.5">
          <span className={cn('size-1.5 rounded-full', statusDot)} />
        </span>
        <span className="text-[8px] font-medium uppercase tracking-wider text-subtle-foreground">
          v{APP_VERSION}
        </span>
      </div>
    </aside>
  );
}
