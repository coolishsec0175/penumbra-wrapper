import { useState } from 'react';
import { useDeviceStore } from '../../store/deviceStore';
import { getBasename } from '../../services/utils/pathUtils';
import { AsciiLogo } from '../penumbra/AsciiLogo';
import { MenuList, type MenuItem } from '../penumbra/MenuList';
import { StatusCard } from '../penumbra/StatusCard';

interface WelcomeScreenProps {
  isConnecting: boolean;
  isSettingsLoading: boolean;
  onSelectDa: () => void;
  onSelectPreloader: () => void;
  onConnect: () => void;
  onNavigate: (path: string) => void;
}

/**
 * The Antumbra welcome page: ASCII banner, description menu and the
 * DA / Preloader status cards, faithfully mirroring the TUI.
 */
export function WelcomeScreen({
  isConnecting,
  isSettingsLoading,
  onSelectDa,
  onSelectPreloader,
  onConnect,
  onNavigate,
}: WelcomeScreenProps) {
  const daPath = useDeviceStore((state) => state.daPath);
  const preloaderPath = useDeviceStore((state) => state.preloaderPath);

  const busy = isConnecting || isSettingsLoading;

  const items: MenuItem[] = [
    {
      icon: '☾',
      label: 'Select DA',
      description: 'Select a DA file for entering DA mode',
      disabled: busy,
    },
    {
      icon: '☾',
      label: 'Select Preloader',
      description: 'Only needed if connecting in BROM',
      disabled: busy,
    },
    {
      icon: '◈',
      label: 'Connect Device',
      description: 'Flash, unlock, and manage device',
      disabled: busy || !daPath,
    },
    { icon: '⏻', label: 'Options', description: 'Change Antumbra settings' },
    { icon: '⚒', label: 'Tools', description: 'Backup, restore & bootloader tools' },
    { icon: '⚡', label: 'Log', description: 'View the operation console output' },
  ];

  const actions = [onSelectDa, onSelectPreloader, onConnect, () => onNavigate('/settings'), () => onNavigate('/tools'), () => onNavigate('/log')];

  const [selected, setSelected] = useState(0);

  const handleActivate = (index: number) => {
    const action = actions[index];
    if (action) action();
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-4">
      <AsciiLogo />
      <p className="font-mono text-xs text-muted-foreground">
        MediaTek flashing, readback and bootloader tool
      </p>

      <MenuList
        items={items}
        selectedIndex={selected}
        onSelect={setSelected}
        onActivate={handleActivate}
        className="w-full max-w-2xl"
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <StatusCard
          label="DA"
          value={daPath ? getBasename(daPath) : 'Not selected'}
          icon={<span className="text-accent">☽</span>}
        />
        <StatusCard
          label="PL"
          value={preloaderPath ? getBasename(preloaderPath) : 'Not selected'}
          icon={<span className="text-accent">⚡</span>}
        />
      </div>
    </div>
  );
}
