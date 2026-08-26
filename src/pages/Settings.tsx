import { useState } from 'react';
import type { ReactNode } from 'react';
import { Download, FileClock, FolderOpen, Minus, Plus, X } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useDeviceStore } from '../store/deviceStore';
import { useUpdateStore } from '../store/updateStore';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { getBasename } from '../services/utils/pathUtils';
import { Button } from '../components/ui/button';
import { PenumbraDropdown, type DropdownOption } from '../components/penumbra/Dropdown';
import { Panel } from '../components/penumbra/Panel';
import { ChangelogModal } from '../components/ChangelogModal';

interface PathRowProps {
  label: string;
  path: string | null;
  placeholder: string;
  title?: string;
  loading?: boolean;
  onBrowse: () => void;
  onClear?: () => void;
}

function PathRow({ label, path, placeholder, title, loading, onBrowse, onClear }: PathRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm font-bold text-foreground">{label}:</span>
      <button
        onClick={onBrowse}
        disabled={loading}
        title={title}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:border-trace-copper disabled:opacity-40"
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{path ? getBasename(path) : placeholder}</span>
      </button>
      {path && onClear && (
        <Button onClick={onClear} disabled={loading} variant="outline" size="icon" className="h-7 w-7" title={`Clear ${label}`}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface OptionRowProps {
  label: string;
  description: ReactNode;
  children: ReactNode;
}

function OptionRow({ label, description, children }: OptionRowProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="font-bold text-foreground">{label}: </span>
        <span className="text-muted-foreground">{description}</span>
      </p>
      {children}
    </div>
  );
}

function ToggleDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const options: DropdownOption[] = [
    { label: 'On', value: 'on' },
    { label: 'Off', value: 'off' },
  ];
  return (
    <PenumbraDropdown
      label={label}
      options={options}
      value={value ? 'on' : 'off'}
      onChange={(v) => onChange(v === 'on')}
    />
  );
}

export function Settings() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const compactView = useUIStore((state) => state.compactView);
  const setCompactView = useUIStore((state) => state.setCompactView);
  const logFontSize = useUIStore((state) => state.logFontSize);
  const setLogFontSize = useUIStore((state) => state.setLogFontSize);

  const {
    daPath,
    preloaderPath,
    authPath,
    defaultOutputPath,
    isSettingsLoading,
    setDaPath,
    setPreloaderPath,
    setAuthPath,
    setDefaultOutputPath,
  } = useDeviceStore();
  const usbLog = useDeviceStore((state) => state.usbLog);
  const verbose = useDeviceStore((state) => state.verbose);
  const setUsbLog = useDeviceStore((state) => state.setUsbLog);
  const setVerbose = useDeviceStore((state) => state.setVerbose);
  const { selectFile } = useFileSelection();

  const isCheckingUpdate = useUpdateStore((state) => state.isCheckingUpdate);
  const checkUpdate = useUpdateStore((state) => state.checkUpdate);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const handleCheckUpdates = async () => {
    await checkUpdate({ showToast: true });
  };

  const themeOptions: DropdownOption[] = [
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
  ];

  const handleSelectDa = async () => {
    const path = await selectFile(DialogType.DA_FILE);
    if (path) {
      await setDaPath(path);
    }
  };

  const handleSelectPreloader = async () => {
    const path = await selectFile(DialogType.PRELOADER_FILE);
    if (path) {
      await setPreloaderPath(path);
    }
  };

  const handleSelectAuth = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select DAA Auth File',
      filters: [{ name: 'Auth Files', extensions: ['auth', 'bin', 'daa'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (path) {
      await setAuthPath(path);
    }
  };

  const handleSelectOutput = async () => {
    const path = await selectFile(DialogType.OUTPUT_FOLDER);
    if (path) {
      await setDefaultOutputPath(path);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-5">
        <p className="text-brand text-center font-display text-lg font-bold uppercase tracking-[0.2em]">
          Settings
        </p>

        <Panel title="INTERFACE">
          <div className="flex flex-col gap-5">
            <OptionRow label="Theme" description="Dark or light color mode">
              <PenumbraDropdown
                label="Mode"
                options={themeOptions}
                value={theme}
                onChange={(v) => setTheme(v as 'dark' | 'light')}
              />
            </OptionRow>

            <OptionRow label="Compact View" description="Tighter list and table margins">
              <ToggleDropdown label="Compact" value={compactView} onChange={setCompactView} />
            </OptionRow>

            <OptionRow label="Console Font Size" description="Size of text in the log consoles">
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => setLogFontSize(Math.max(10, logFontSize - 1))}
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="Decrease font size"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-14 rounded-md border border-border bg-muted px-2 py-1 text-center text-sm tabular-nums text-foreground">
                  {logFontSize}px
                </span>
                <Button
                  onClick={() => setLogFontSize(Math.min(20, logFontSize + 1))}
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="Increase font size"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </OptionRow>
          </div>
        </Panel>

        <Panel title="PATHS">
          <div className="flex flex-col gap-3">
            <PathRow
              label="DA Loader"
              path={daPath}
              placeholder="Select DA file"
              loading={isSettingsLoading}
              onBrowse={handleSelectDa}
            />
            <PathRow
              label="Preloader"
              path={preloaderPath}
              placeholder="Optional"
              loading={isSettingsLoading}
              onBrowse={handleSelectPreloader}
              onClear={() => void setPreloaderPath(null)}
            />
            <PathRow
              label="Auth"
              path={authPath}
              placeholder="Optional"
              loading={isSettingsLoading}
              onBrowse={handleSelectAuth}
              onClear={() => void setAuthPath(null)}
            />
            <PathRow
              label="Output Folder"
              path={defaultOutputPath}
              placeholder="Select output folder"
              loading={isSettingsLoading}
              onBrowse={handleSelectOutput}
              onClear={() => void setDefaultOutputPath(null)}
            />
          </div>
        </Panel>

        <Panel title="DIAGNOSTICS">
          <div className="flex flex-col gap-5">
            <OptionRow
              label="USB Log"
              description={
                <span>
                  Pass <span className="font-mono text-xs">--usb-log</span> to capture DA logging over USB.
                </span>
              }
            >
              <ToggleDropdown label="USB Log" value={usbLog} onChange={setUsbLog} />
            </OptionRow>

            <OptionRow
              label="Verbose"
              description={
                <span>
                  Pass <span className="font-mono text-xs">--verbose</span> for detailed antumbra output.
                </span>
              }
            >
              <ToggleDropdown label="Verbose" value={verbose} onChange={setVerbose} />
            </OptionRow>
          </div>
        </Panel>

        <Panel title="ANTUMBRA">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCheckUpdates} disabled={isCheckingUpdate}>
              <Download className="h-4 w-4" />
              {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
            </Button>
            <Button onClick={() => setIsChangelogOpen(true)} variant="outline">
              <FileClock className="h-4 w-4" />
              Changelog
            </Button>
          </div>
        </Panel>
      </div>

      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </div>
  );
}
