import { useState } from 'react';
import { Download, FileClock, Moon, Monitor, Palette, Sun, Usb, Bug, Check } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useDeviceStore } from '../store/deviceStore';
import { useUpdateStore } from '../store/updateStore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { cn } from '../lib/utils';
import { THEME_ACCENTS, type ThemeAccent } from '../lib/theme';
import { ChangelogModal } from '../components/ChangelogModal';

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

export function Settings() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const accent = useUIStore((state) => state.accent);
  const setAccent = useUIStore((state) => state.setAccent);

  const usbLog = useDeviceStore((state) => state.usbLog);
  const verbose = useDeviceStore((state) => state.verbose);
  const setUsbLog = useDeviceStore((state) => state.setUsbLog);
  const setVerbose = useDeviceStore((state) => state.setVerbose);

  const isCheckingUpdate = useUpdateStore((state) => state.isCheckingUpdate);
  const checkUpdate = useUpdateStore((state) => state.checkUpdate);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const handleCheckUpdates = async () => {
    await checkUpdate({ showToast: true });
  };

  return (
    <div className="h-screen overflow-y-auto bg-background text-foreground">
      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-subtle-foreground">
            Customize appearance, diagnostics flags, and manage antumbra updates.
          </p>
        </div>

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
              <p className="mb-2 text-sm font-medium text-muted-foreground">Accent color</p>
              <div className="flex flex-wrap items-center gap-3">
                {ACCENT_SWATCHES.map(({ accent: value, label, className }) => (
                  <button
                    key={value}
                    onClick={() => setAccent(value)}
                    title={label}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110',
                      className,
                      accent === value && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                    )}
                  >
                    {accent === value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
                <span className="text-sm text-subtle-foreground">
                  {ACCENT_SWATCHES.find((s) => s.accent === accent)?.label ?? 'Blue'}
                </span>
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
