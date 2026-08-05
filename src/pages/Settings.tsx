import { useState } from 'react';
import {
  Download,
  FileClock,
  FolderOpen,
  Minus,
  Moon,
  Monitor,
  Palette,
  Plus,
  Sun,
  Usb,
  Bug,
  Check,
  LayoutGrid,
  Type,
  X,
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useDeviceStore } from '../store/deviceStore';
import { useUpdateStore } from '../store/updateStore';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { getBasename } from '../services/utils/pathUtils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { cn } from '../lib/utils';
import { THEME_ACCENTS, THEME_PRESETS, type ThemeAccent } from '../lib/theme';
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
    <div className="flex items-center gap-2">
      <label className="w-32 shrink-0 text-sm font-medium text-muted-foreground">{label}</label>
      <Button
        onClick={onBrowse}
        disabled={loading}
        variant="outline"
        size="sm"
        className="min-w-0 flex-1 justify-start"
        title={title}
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{path ? getBasename(path) : placeholder}</span>
      </Button>
      {path && onClear && (
        <Button onClick={onClear} disabled={loading} variant="destructive" size="icon" className="h-8 w-8" title={`Clear ${label}`}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

const ACCENT_SWATCHES: Array<{ accent: ThemeAccent; label: string; className: string }> =
  THEME_ACCENTS.map((accent) => {
    const label = accent.charAt(0).toUpperCase() + accent.slice(1);
    const className = {
      blue: 'bg-blue-500',
      purple: 'bg-violet-500',
      teal: 'bg-teal-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
    }[accent];
    return { accent, label, className };
  });

const PRESET_SWATCH_CLASSES: Record<string, string> = {
  zinc: 'from-zinc-700 to-zinc-900',
  charcoal: 'from-violet-500 to-zinc-900',
  sunset: 'from-rose-400 to-slate-800',
  warm: 'from-orange-500 to-red-900',
  cool: 'from-cyan-400 to-blue-950',
  hacker: 'from-lime-400 to-green-950',
};

export function Settings() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const accent = useUIStore((state) => state.accent);
  const setAccent = useUIStore((state) => state.setAccent);
  const preset = useUIStore((state) => state.preset);
  const setPreset = useUIStore((state) => state.setPreset);
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

  const accentDisabled = theme !== 'dark' || preset !== 'zinc';

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
      <main className="w-full space-y-4 p-5">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-subtle-foreground">
            Customize appearance, diagnostics flags, and manage antumbra updates.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <CardTitle>Path Configuration</CardTitle>
            </div>
            <CardDescription>Files antumbra needs before connecting to a device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Choose how Penumbra looks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Theme mode</p>
              <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                <Button
                  onClick={() => setTheme('dark')}
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="justify-start"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
                <Button
                  onClick={() => setTheme('light')}
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="justify-start"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Interface theme
                {theme !== 'dark' && <span className="ml-2 text-xs">(available in dark mode)</span>}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {THEME_PRESETS.map(({ preset: value, label }) => (
                  <button
                    key={value}
                    onClick={() => theme === 'dark' && setPreset(value)}
                    title={label}
                    disabled={theme !== 'dark'}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-1.5 pr-3 transition-colors',
                      theme !== 'dark' && 'opacity-40',
                      preset === value && theme === 'dark'
                        ? 'border-primary bg-primary-soft'
                        : 'border-border hover:border-primary'
                    )}
                  >
                    <span
                      className={cn(
                        'size-6 rounded bg-gradient-to-br',
                        PRESET_SWATCH_CLASSES[value]
                      )}
                    />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    {preset === value && theme === 'dark' && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn(accentDisabled && 'opacity-40')}>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Accent color
                {accentDisabled && (
                  <span className="ml-2 text-xs">(select the Zinc theme to use accents)</span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {ACCENT_SWATCHES.map(({ accent: value, label, className }) => (
                  <button
                    key={value}
                    onClick={() => !accentDisabled && setAccent(value)}
                    disabled={accentDisabled}
                    title={label}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110',
                      className,
                      accent === value && !accentDisabled && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                    )}
                  >
                    {accent === value && !accentDisabled && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
                <span className="text-sm text-subtle-foreground">
                  {ACCENT_SWATCHES.find((s) => s.accent === accent)?.label ?? 'Blue'}
                </span>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    Compact View
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tighter list and table margins.
                  </p>
                </div>
                <Button
                  onClick={() => setCompactView(!compactView)}
                  variant={compactView ? 'default' : 'outline'}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {compactView ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Type className="h-4 w-4 text-primary" />
                    Console Font Size
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Adjust the size of text in the log consoles.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => setLogFontSize(Math.max(10, logFontSize - 1))}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    title="Decrease font size"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-14 text-center text-sm tabular-nums text-foreground">
                    {logFontSize}px
                  </span>
                  <Button
                    onClick={() => setLogFontSize(Math.min(20, logFontSize + 1))}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    title="Increase font size"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              <CardTitle>Diagnostics</CardTitle>
            </div>
            <CardDescription>Flags passed to the antumbra CLI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">USB Log</p>
                <p className="text-sm text-muted-foreground">
                  Pass <span className="font-mono text-xs">--usb-log</span> to capture DA logging over USB.
                </p>
              </div>
              <Button
                onClick={() => setUsbLog(!usbLog)}
                variant={usbLog ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0"
              >
                <Usb className="h-4 w-4" />
                {usbLog ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">Verbose</p>
                <p className="text-sm text-muted-foreground">
                  Pass <span className="font-mono text-xs">--verbose</span> for detailed antumbra output.
                </p>
              </div>
              <Button
                onClick={() => setVerbose(!verbose)}
                variant={verbose ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0"
              >
                <Bug className="h-4 w-4" />
                {verbose ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle>Antumbra</CardTitle>
            </div>
            <CardDescription>Check for updates and browse release notes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCheckUpdates} disabled={isCheckingUpdate}>
              <Download className="h-4 w-4" />
              {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
            </Button>
            <Button onClick={() => setIsChangelogOpen(true)} variant="outline">
              <FileClock className="h-4 w-4" />
              Changelog
            </Button>
          </CardContent>
        </Card>
      </main>

      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </div>
  );
}
