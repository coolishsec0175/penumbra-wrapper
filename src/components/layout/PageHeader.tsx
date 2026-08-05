/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronDown,
  FileStack,
  Grid,
  Power,
  RotateCw,
  Settings,
  Terminal,
  Usb,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../../store/deviceStore';
import { useOperationStore } from '../../store/operationStore';
import { useFlasherStore } from '../../store/flasherStore';
import { useDeviceConnection } from '../../hooks/useDeviceConnection';
import { useConfirmation } from '../../hooks/useConfirmation';
import { DeviceApi } from '../../services/api/deviceApi';
import { ErrorHandler } from '../../services/utils/errorHandler';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const APP_VERSION = '1.1.0';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Grid, end: true },
  { to: '/flasher', label: 'Flasher', icon: FileStack, end: false },
  { to: '/tools', label: 'Tools', icon: Wrench, end: false },
  { to: '/log', label: 'Log', icon: Terminal, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

const REBOOT_MODES = [
  { key: 'normal', label: 'Normal' },
  { key: 'home-screen', label: 'Home Screen' },
  { key: 'fastboot', label: 'Fastboot' },
  { key: 'meta', label: 'Meta' },
  { key: 'test', label: 'Test' },
] as const;

type RebootMode = (typeof REBOOT_MODES)[number]['key'];

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

export function PageHeader() {
  const daPath = useDeviceStore((state) => state.daPath);
  const preloaderPath = useDeviceStore((state) => state.preloaderPath);
  const isRunning = useOperationStore((state) => state.isRunning);
  const operationType = useOperationStore((state) => state.type);
  const { isConnected, isConnecting, connect, disconnect } = useDeviceConnection();
  const {
    isFlashing,
    currentFlashIndex,
    totalFlashCount,
    flashModalMinimized,
    openFlashModal,
  } = useFlasherStore();
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
    <header className="flex flex-shrink-0 flex-col border-b border-border bg-surface">
      {/* Top row: brand + device actions */}
      <div className="flex h-16 items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-3">
          <PenumbraLogo />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">Penumbra</h1>
            <p className="truncate text-[11px] text-subtle-foreground">v{APP_VERSION}</p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-[3px] border border-border bg-surface px-2.5 py-1.5">
            <span className={cn('size-2 rounded-full', dotColor)} />
            <span className="text-xs font-semibold text-foreground">{statusLabel}</span>
          </div>

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

          {isFlashing && flashModalMinimized && (
            <Button
              onClick={openFlashModal}
              variant="warning"
              size="sm"
              title="Show flash progress"
            >
              <Zap className="h-4 w-4 shrink-0 animate-pulse" />
              <span className="font-medium">
                Flashing {currentFlashIndex}/{totalFlashCount}
              </span>
            </Button>
          )}

          <Button
            onClick={handlePrimaryAction}
            variant={isConnected ? 'destructive' : 'default'}
            size="sm"
            className="text-[11px] font-semibold uppercase"
            title={actionLabel}
          >
            {showCancel ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <Usb className="h-3.5 w-3.5" />
            )}
            {actionLabel}
          </Button>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
