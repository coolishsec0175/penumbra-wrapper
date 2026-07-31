import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdbListEntry, AdbRebootMode, AdbUsbDevice } from '../../types';
import { ProgressBar } from '../ProgressBar';

interface AdbToolsGridProps {
  devices: AdbUsbDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isAuthCheckRunning: boolean;
  isFileOperationRunning: boolean;
  isPackageRunning: boolean;
  isSystemActionRunning: boolean;
  isScreenshotRunning: boolean;
  listPath: string;
  pushLocalPath: string | null;
  pushRemotePath: string;
  pullRemotePath: string;
  pullLocalPath: string | null;
  installApkPath: string | null;
  uninstallPackage: string;
  listResults: AdbListEntry[];
  transferProgress: number | null;
  transferStatus: string | null;
  rebootMode: AdbRebootMode;
  onRefresh: () => void;
  onAuthCheck: () => void;
  onSelectDevice: (deviceId: string) => void;
  onListPathChange: (value: string) => void;
  onList: () => void;
  onSelectPushLocal: () => void;
  onPushRemoteChange: (value: string) => void;
  onPush: () => void;
  onSelectPullLocal: () => void;
  onPullRemoteChange: (value: string) => void;
  onPull: () => void;
  onSelectInstallApk: () => void;
  onInstall: () => void;
  onUninstallPackageChange: (value: string) => void;
  onUninstall: () => void;
  onSystemAction: (action: string) => void;
  onRebootSelect: (mode: AdbRebootMode) => void;
  onScreenshot: () => void;
}

const rebootOptions: { value: AdbRebootMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'bootloader', label: 'Bootloader' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'fastboot', label: 'Fastboot' },
];

export function AdbToolsGrid({
  devices,
  selectedDeviceId,
  isRefreshing,
  isAuthCheckRunning,
  isFileOperationRunning,
  isPackageRunning,
  isSystemActionRunning,
  isScreenshotRunning,
  listPath,
  pushLocalPath,
  pushRemotePath,
  pullRemotePath,
  pullLocalPath,
  installApkPath,
  uninstallPackage,
  listResults,
  transferProgress,
  transferStatus,
  rebootMode,
  onRefresh,
  onAuthCheck,
  onSelectDevice,
  onListPathChange,
  onList,
  onSelectPushLocal,
  onPushRemoteChange,
  onPush,
  onSelectPullLocal,
  onPullRemoteChange,
  onPull,
  onSelectInstallApk,
  onInstall,
  onUninstallPackageChange,
  onUninstall,
  onSystemAction,
  onRebootSelect,
  onScreenshot,
}: AdbToolsGridProps) {
  const hasDevices = devices.length > 0;
  const isDeviceSelected = !!selectedDeviceId;
  const [rebootOpen, setRebootOpen] = useState(false);
  const rebootRef = useRef<HTMLDivElement | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const deviceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rebootRef.current && !rebootRef.current.contains(event.target as Node)) {
        setRebootOpen(false);
      }
      if (deviceRef.current && !deviceRef.current.contains(event.target as Node)) {
        setDeviceOpen(false);
      }
    };

    if (rebootOpen || deviceOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rebootOpen, deviceOpen]);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4 md:col-span-2 xl:col-span-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:flex-1 xl:justify-between">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:min-w-[20rem]" ref={deviceRef}>
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setDeviceOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {selectedDeviceId
                    ? devices.find((device) => device.id === selectedDeviceId)?.description ||
                      'Selected device'
                    : 'Select device'}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {deviceOpen && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
                    {devices.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-muted-foreground">No devices</div>
                    ) : (
                      devices.map((device) => (
                        <button
                          key={device.id}
                          onClick={() => {
                            setDeviceOpen(false);
                            onSelectDevice(device.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
                        >
                          {device.description} ({device.vendorId.toString(16)}:{device.productId.toString(16)})
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={onAuthCheck}
                  disabled={!isDeviceSelected || isAuthCheckRunning}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {isAuthCheckRunning ? 'Checking...' : 'Check Authorization'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${hasDevices ? 'bg-success' : 'bg-border'}`} />
                {hasDevices ? (isDeviceSelected ? 'Device selected' : 'Select a device') : 'No device'}
              </div>
              <div className="relative" ref={rebootRef}>
                <button
                  type="button"
                  onClick={() => setRebootOpen((open) => !open)}
                  disabled={!isDeviceSelected || isSystemActionRunning}
                  className="flex min-w-[8rem] items-center justify-between rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  Reboot
                  <ChevronDown className="w-4 h-4" />
                </button>
                {rebootOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
                    {rebootOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setRebootOpen(false);
                          onRebootSelect(option.value);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors ${
                          option.value === rebootMode ? 'bg-surface-hover font-semibold' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {!hasDevices && (
          <div className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs text-muted-foreground">
            No USB ADB devices detected.
          </div>
        )}
        <p className="text-xs text-muted-foreground">Unlock the device if storage access fails.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4 md:col-span-2 xl:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle-foreground">File Ops</p>
          <h3 className="text-base font-semibold text-foreground">List</h3>
        </div>
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <input
              value={listPath}
              onChange={(event) => onListPathChange(event.target.value)}
              placeholder="/sdcard"
              className="flex-1 rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={onList}
              disabled={!isDeviceSelected || !listPath.trim() || isFileOperationRunning}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              List
            </button>
          </div>
        </div>
        {listResults.length > 0 ? (
          <div className="max-h-32 overflow-auto rounded-md border border-border bg-surface-alt p-3 text-xs text-muted-foreground">
            {listResults.map((entry) => (
              <div key={`${entry.entry_type}-${entry.name}`} className="flex justify-between">
                <span className="text-foreground">{entry.name}</span>
                <span>{entry.entry_type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No entries loaded yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4 md:col-span-2 xl:col-span-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle-foreground">Snapshot</p>
          <h3 className="text-base font-semibold text-foreground">Framebuffer Capture</h3>
        </div>
        <button
          onClick={onScreenshot}
          disabled={!isDeviceSelected || isScreenshotRunning}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isScreenshotRunning ? 'Saving...' : 'Save Screenshot'}
        </button>
        <p className="text-xs text-muted-foreground">Saved to Antumbra output directory.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4 md:col-span-2 xl:col-span-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle-foreground">Transfers</p>
          <h3 className="text-base font-semibold text-foreground">Push & Pull</h3>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 min-w-0">
            <button
              onClick={onSelectPushLocal}
              disabled={isFileOperationRunning}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {pushLocalPath ? 'Change Local File' : 'Select Local File'}
            </button>
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {pushLocalPath || 'No file selected'}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <input
              value={pushRemotePath}
              onChange={(event) => onPushRemoteChange(event.target.value)}
              placeholder="/sdcard"
              className="flex-1 rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={onPush}
              disabled={!isDeviceSelected || !pushLocalPath || !pushRemotePath.trim() || isFileOperationRunning}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              Push
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Remote path is treated as a directory. The local filename will be appended.
        </p>
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <input
              value={pullRemotePath}
              onChange={(event) => onPullRemoteChange(event.target.value)}
              placeholder="/sdcard/download.bin"
              className="flex-1 rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={onSelectPullLocal}
              disabled={isFileOperationRunning}
              className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              {pullLocalPath ? 'Change Save Path' : 'Save Path'}
            </button>
            <button
              onClick={onPull}
              disabled={!isDeviceSelected || !pullRemotePath.trim() || !pullLocalPath || isFileOperationRunning}
              className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
            >
              Pull
            </button>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-full">
            {pullLocalPath || 'No save path selected'}
          </span>
        </div>
        {transferProgress !== null && (
          <ProgressBar progress={transferProgress} status={transferStatus || undefined} className="mt-1" />
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4 md:col-span-2 xl:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle-foreground">Packages</p>
          <h3 className="text-base font-semibold text-foreground">Install / Uninstall</h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
          <button
            onClick={onSelectInstallApk}
            disabled={isPackageRunning}
            className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            {installApkPath ? 'Change APK' : 'Select APK'}
          </button>
          <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
            {installApkPath || 'No APK selected'}
          </span>
          <button
            onClick={onInstall}
            disabled={!isDeviceSelected || !installApkPath || isPackageRunning}
            className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
          >
            Install
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={uninstallPackage}
            onChange={(event) => onUninstallPackageChange(event.target.value)}
            placeholder="com.example.app"
            className="flex-1 px-3 py-2 bg-surface-alt border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={onUninstall}
            disabled={!isDeviceSelected || !uninstallPackage.trim() || isPackageRunning}
              className="rounded-md bg-danger px-3 py-2 text-sm font-semibold text-danger-foreground transition-colors hover:bg-danger-hover disabled:opacity-50"
          >
            Uninstall
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-4 md:col-span-2 xl:col-span-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle-foreground">System</p>
          <h3 className="text-base font-semibold text-foreground">System Actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'root', label: 'Root' },
            { key: 'remount', label: 'Remount' },
            { key: 'enable-verity', label: 'Enable Verity' },
            { key: 'disable-verity', label: 'Disable Verity' },
          ].map((action) => (
            <button
              key={action.key}
              onClick={() => onSystemAction(action.key)}
              disabled={!isDeviceSelected || isSystemActionRunning}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
