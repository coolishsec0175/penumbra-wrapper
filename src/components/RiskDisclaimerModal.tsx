import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const ACCEPT_DELAY_SECONDS = 5;

export function RiskDisclaimerModal() {
  const acceptedRisk = useUIStore((state) => state.acceptedRisk);
  const setAcceptedRisk = useUIStore((state) => state.setAcceptedRisk);
  const [countdown, setCountdown] = useState(ACCEPT_DELAY_SECONDS);

  const isOpen = !acceptedRisk;

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, countdown]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/60 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <Card className="mx-3 w-full max-w-lg overflow-hidden border-danger bg-surface shadow-2xl">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-danger-soft p-3">
              <ShieldAlert className="h-6 w-6 text-danger" />
            </div>
            <div>
              <CardTitle className="text-xl">Welcome to Penumbra</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                MediaTek flashing, readback and bootloader tool
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-danger">
              <AlertTriangle className="h-4 w-4" />
              Risk Warning
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Penumbra is in early development and can break easily. Flashing, unlocking, or
              relocking bootloaders on MediaTek devices carries inherent risk. Mismatched
              firmware files, interrupted writes, or unsupported chipsets can easily{' '}
              <span className="font-semibold text-foreground">brick your device</span>. Use this
              software entirely at your own risk.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-accent">
              System Requirements
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>
                Windows: install WinUSB or LibUSB drivers on the device (e.g. via Zadig or the
                provided driver installer).
              </li>
              <li>
                Linux: install libudev and add your user to the dialout group; configure udev
                rules if the device is not recognized.
              </li>
            </ul>
          </div>
        </CardContent>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface p-4">
          <span className="text-xs text-subtle-foreground">
            Accept in {countdown}s
          </span>
          <Button
            onClick={() => setAcceptedRisk(true)}
            disabled={countdown > 0}
            variant="destructive"
          >
            I Understand And Accept The Risk{countdown > 0 ? ` (${countdown})` : ''}
          </Button>
        </div>
      </Card>
    </div>
  );
}
