import { useCallback, useMemo, useRef, useState } from 'react';
import { Moon, Plug, Settings, Terminal, Wrench, Zap } from 'lucide-react';
import { useDeviceStore } from '../../store/deviceStore';
import { getBasename } from '../../services/utils/pathUtils';
import { useGlobalKeydown } from '../../hooks/useGlobalKeydown';
import { AsciiLogo } from '../penumbra/AsciiLogo';
import { MenuList, type MenuItem } from '../penumbra/MenuList';
import { StatusCard } from '../penumbra/StatusCard';
import { DecryptedText } from '../reactbits/DecryptedText';

interface WelcomeScreenProps {
  isConnecting: boolean;
  isSettingsLoading: boolean;
  onSelectDa: () => void;
  onSelectPreloader: () => void;
  onConnect: () => void;
  onNavigate: (path: string) => void;
}

/**
 * The Penumbra welcome page: wordmark banner, description menu and the
 * DA / Preloader status cards.
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

  const items = useMemo<MenuItem[]>(
    () => [
      {
        icon: <Moon className="h-4 w-4" />,
        label: 'Select DA',
        description: 'Select a DA file for entering DA mode',
        disabled: busy,
      },
      {
        icon: <Moon className="h-4 w-4" />,
        label: 'Select Preloader',
        description: 'Only needed if connecting in BROM',
        disabled: busy,
      },
      {
        icon: <Plug className="h-4 w-4" />,
        label: 'Connect Device',
        description: 'Flash, unlock, and manage device',
        disabled: busy || !daPath,
      },
      { icon: <Settings className="h-4 w-4" />, label: 'Options', description: 'Change Penumbra settings' },
      { icon: <Wrench className="h-4 w-4" />, label: 'Tools', description: 'Backup, restore & bootloader tools' },
      { icon: <Terminal className="h-4 w-4" />, label: 'Log', description: 'View the operation console output' },
    ],
    [busy, daPath]
  );

  const actions = useMemo(
    () => [
      onSelectDa,
      onSelectPreloader,
      onConnect,
      () => onNavigate('/settings'),
      () => onNavigate('/tools'),
      () => onNavigate('/log'),
    ],
    [onSelectDa, onSelectPreloader, onConnect, onNavigate]
  );

  const [selected, setSelected] = useState(0);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const handleActivate = useCallback(
    (index: number) => {
      const action = actions[index];
      if (action) action();
    },
    [actions]
  );

  const move = useCallback(
    (delta: number) => {
      setSelected((prev) => Math.max(0, Math.min(items.length - 1, prev + delta)));
    },
    [items.length]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (menuWrapRef.current?.contains(e.target as Node)) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter') {
        const item = items[selected];
        if (item && !item.disabled) {
          e.preventDefault();
          handleActivate(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelected(0);
      }
    },
    [items, move, selected, handleActivate]
  );

  useGlobalKeydown(handleKeyDown);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-7 overflow-y-auto px-4">
      <div className="animate-fade-in-up flex flex-col items-center gap-3">
        <AsciiLogo />
        <p className="font-mono text-xs text-muted-foreground">
          <DecryptedText
            text="MediaTek flashing, readback and bootloader tool"
            speed={35}
            maxIterations={6}
            animateOn="view"
            className="text-muted-foreground"
            encryptedClassName="text-muted-foreground"
          />
        </p>
      </div>

      <div
        ref={menuWrapRef}
        className="animate-fade-in-up w-full max-w-2xl [animation-delay:120ms]"
      >
        <MenuList
          items={items}
          selectedIndex={selected}
          onSelect={setSelected}
          onActivate={handleActivate}
          onBack={() => setSelected(0)}
          className="w-full max-w-2xl"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <StatusCard
          label="DA"
          value={daPath ? getBasename(daPath) : 'Not selected'}
          icon={<Moon className="h-4 w-4 text-trace-copper" />}
        />
        <StatusCard
          label="PL"
          value={preloaderPath ? getBasename(preloaderPath) : 'Not selected'}
          icon={<Zap className="h-4 w-4 text-trace-copper" />}
        />
      </div>
    </div>
  );
}