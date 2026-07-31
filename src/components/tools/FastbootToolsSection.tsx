import type { FastbootDevice, FastbootRebootMode, FastbootSlot } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';

interface FastbootInfoField {
  label: string;
  value: string;
}

interface FastbootToolsSectionProps {
  devices: FastbootDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isGetvarRunning: boolean;
  isGetvarSingleRunning: boolean;
  isFlashRunning: boolean;
  isRebootRunning: boolean;
  isSlotRunning: boolean;
  isEraseRunning: boolean;
  flashImagePath: string | null;
  flashPartition: string;
  getvarName: string;
  getvarValue: string | null;
  erasePartition: string;
  deviceInfoFields: FastbootInfoField[];
  hasDeviceInfo: boolean;
  rawDeviceInfoLines: string[];
  hasSlotSupport: boolean;
  currentSlot: string | null;
  slotSupportMessage: string;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  onGetvarAll: () => void;
  onGetvarSingle: () => void;
  onSelectFlashImage: () => void;
  onFlashPartitionChange: (value: string) => void;
  onFlash: () => void;
  onGetvarNameChange: (value: string) => void;
  onErasePartitionChange: (value: string) => void;
  onErase: () => void;
  onSetActiveSlot: (slot: FastbootSlot) => void;
  onReboot: (mode: FastbootRebootMode) => void;
  onRebootFastbootd: () => void;
}

export function FastbootToolsSection({
  devices,
  selectedDeviceId,
  isRefreshing,
  isGetvarRunning,
  isGetvarSingleRunning,
  isFlashRunning,
  isRebootRunning,
  isSlotRunning,
  isEraseRunning,
  flashImagePath,
  flashPartition,
  getvarName,
  getvarValue,
  erasePartition,
  deviceInfoFields,
  hasDeviceInfo,
  rawDeviceInfoLines,
  hasSlotSupport,
  currentSlot,
  slotSupportMessage,
  onSelectDevice,
  onRefresh,
  onGetvarAll,
  onGetvarSingle,
  onSelectFlashImage,
  onFlashPartitionChange,
  onFlash,
  onGetvarNameChange,
  onErasePartitionChange,
  onErase,
  onSetActiveSlot,
  onReboot,
  onRebootFastbootd,
}: FastbootToolsSectionProps) {
  const formatDeviceLabel = (device: FastbootDevice) => {
    const serial = device.serialNumber || 'Unknown serial';
    const product = device.product || 'Fastboot device';
    return `${product} (${serial})`;
  };

  const hasDevices = devices.length > 0;
  const slotActionsDisabled = !hasSlotSupport || !selectedDeviceId || isSlotRunning;
  const rebootDisabled = !selectedDeviceId || isRebootRunning;
  const getvarSingleDisabled = !selectedDeviceId || isGetvarSingleRunning;
  const eraseDisabled = !selectedDeviceId || !erasePartition || isEraseRunning;

  return (
    <Card className="space-y-4 border-border bg-surface-alt p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Fastboot Tools</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use these tools only after the device is already in Fastboot mode.
        </p>
      </div>

      {!hasDevices && (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">
          No fastboot devices detected. Put the device in fastboot mode and click refresh.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-2 block text-xs uppercase tracking-wide text-subtle-foreground">
            Fastboot Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <option value="">Select a device</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {formatDeviceLabel(device)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onRefresh} disabled={isRefreshing} variant="outline">
          {isRefreshing ? 'Refreshing...' : 'Refresh Devices'}
        </Button>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Device Info</h3>
            <p className="text-xs text-muted-foreground">Parsed from getvar all output.</p>
          </div>
          <Button onClick={onGetvarAll} disabled={!selectedDeviceId || isGetvarRunning}>
            {isGetvarRunning ? 'Fetching variables...' : 'Refresh Info'}
          </Button>
        </div>

        {hasDeviceInfo ? (
          <div className="grid gap-3 md:grid-cols-2">
            {deviceInfoFields.map((field) => (
              <Card key={field.label} className="space-y-1 border-border bg-surface p-3">
                <div className="text-xs uppercase tracking-wide text-subtle-foreground">{field.label}</div>
                <div className="mt-1 text-sm text-foreground">{field.value}</div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Run getvar all to populate device information.
          </div>
        )}

        {rawDeviceInfoLines.length > 0 && (
          <Card className="space-y-2 border-border bg-surface p-3">
            <div className="text-sm font-medium text-foreground">Raw getvar output</div>
            <pre className="max-h-48 overflow-auto text-xs text-muted-foreground">
              {rawDeviceInfoLines.join('\n')}
            </pre>
          </Card>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quick Getvar</h3>
            <p className="text-xs text-muted-foreground">Query a single fastboot variable.</p>
          </div>
          <Button onClick={onGetvarSingle} disabled={getvarSingleDisabled || !getvarName.trim()}>
            {isGetvarSingleRunning ? 'Fetching variable...' : 'Getvar'}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-wide text-subtle-foreground">
              Variable Name
            </label>
            <Input
              value={getvarName}
              onChange={(event) => onGetvarNameChange(event.target.value)}
              placeholder="e.g. current-slot"
            />
          </div>
          {getvarValue && (
            <Card className="min-w-[220px] space-y-1 border-border bg-surface p-3">
              <div className="text-xs uppercase tracking-wide text-subtle-foreground">Value</div>
              <div className="mt-1 text-sm text-foreground">{getvarValue}</div>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-wide text-subtle-foreground">
              Partition
            </label>
            <Input
              value={flashPartition}
              onChange={(event) => onFlashPartitionChange(event.target.value)}
              placeholder="e.g. boot, recovery"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-wide text-subtle-foreground">
              Image
            </label>
            <div className="flex gap-2">
            <Input
              value={flashImagePath ?? ''}
              readOnly
              placeholder="Select image file"
              wrapperClassName="flex-1"
            />
            <Button onClick={onSelectFlashImage} variant="outline">
              Browse
            </Button>
            </div>
          </div>
          <Button
            onClick={onFlash}
            disabled={!selectedDeviceId || !flashPartition || !flashImagePath || isFlashRunning}
            variant="secondary"
          >
            {isFlashRunning ? 'Flashing...' : 'Flash'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Erase Partition</h3>
          <p className="text-xs text-muted-foreground">
            This will permanently erase the selected partition.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-wide text-subtle-foreground">
              Partition
            </label>
            <Input
              value={erasePartition}
              onChange={(event) => onErasePartitionChange(event.target.value)}
              placeholder="e.g. userdata"
            />
          </div>
          <Button onClick={onErase} disabled={eraseDisabled} variant="destructive">
            {isEraseRunning ? 'Erasing...' : 'Erase'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Slot Management</h3>
          <p className="text-xs text-muted-foreground">{slotSupportMessage}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-foreground">
            Current slot: <span className="font-semibold">{currentSlot ?? '—'}</span>
          </div>
          <Button onClick={() => onSetActiveSlot('a')} disabled={slotActionsDisabled} variant="outline">
            Set Slot A
          </Button>
          <Button onClick={() => onSetActiveSlot('b')} disabled={slotActionsDisabled} variant="outline">
            Set Slot B
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button onClick={() => onReboot('normal')} disabled={rebootDisabled} variant="outline">
          Reboot
        </Button>
        <Button onClick={() => onReboot('bootloader')} disabled={rebootDisabled} variant="outline">
          Reboot Bootloader
        </Button>
        <Button onClick={() => onReboot('recovery')} disabled={rebootDisabled} variant="outline">
          Reboot Recovery
        </Button>
        <Button onClick={onRebootFastbootd} disabled={rebootDisabled} variant="secondary">
          Reboot Fastbootd
        </Button>
      </div>
    </Card>
  );
}
