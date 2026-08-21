/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, RotateCw, Usb, XCircle, Zap } from 'lucide-react';
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

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/pgpt': 'PGPT',
  '/flasher': 'Flasher',
  '/tools': 'Tools',
  '/log': 'Activity Log',
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

export function TopBar() {
  const location = useLocation();
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

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Antumbra';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRebootOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRebootOpen(false);
      }
    };
    if (rebootOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rebootOpen]);

  const showCancel = isConnecting || isRunning || isFlashing;

  const handlePrimaryAction = () => {
    if (showCancel) {
      DeviceApi.cancelOperation().catch(() => undefined);
      toast('Operation cancelled');
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
      : 'Connect';

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
      toast('Shutdown cancelled');
      return;
    }
    try {
      await DeviceApi.shutdown(daPath, preloaderPath || undefined);
      toast.success('Device shutting down');
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Shutdown');
    }
  };

  const statusColor = isConnecting
    ? 'text-warning'
    : isRunning
      ? 'text-accent'
      : isConnected
        ? 'text-success'
        : 'text-muted-foreground';

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-surface/60 px-4 backdrop-blur-md">
      <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
        {pageTitle}
      </h2>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Status pill */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] font-semibold',
            statusColor
          )}
        >
          <span className="size-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
          {isConnecting
            ? 'Connecting...'
            : isRunning
              ? operationType === 'read'
                ? 'Reading'
                : 'Writing'
              : isConnected
                ? 'Connected'
                : 'Offline'}
        </div>

        {/* Reboot dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setRebootOpen(!rebootOpen)}
            disabled={!isConnected || isConnecting}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] font-semibold uppercase"
          >
            <RotateCw className="h-3 w-3" />
            Reboot
            <ChevronDown className="h-3 w-3" />
          </Button>
          {rebootOpen && (
            <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl backdrop-blur-sm">
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

        {/* Flash progress badge */}
        {isFlashing && flashModalMinimized && (
          <Button
            onClick={openFlashModal}
            variant="warning"
            size="sm"
            className="h-7 px-2 text-[11px]"
            title="Show flash progress"
          >
            <Zap className="h-3 w-3 animate-pulse" />
            <span className="font-medium">
              {currentFlashIndex}/{totalFlashCount}
            </span>
          </Button>
        )}

        {/* Connect/Disconnect */}
        <Button
          onClick={handlePrimaryAction}
          variant={isConnected ? 'destructive' : 'default'}
          size="sm"
          className="h-7 px-2.5 text-[11px] font-semibold uppercase"
          title={actionLabel}
        >
          {showCancel ? (
            <XCircle className="h-3 w-3" />
          ) : (
            <Usb className="h-3 w-3" />
          )}
          {actionLabel}
        </Button>
      </div>
    </header>
  );
}
