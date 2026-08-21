/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet, useLocation } from 'react-router-dom';
import { PageHeader } from './layout/PageHeader';
import { ErrorBanner } from './layout/ErrorBanner';
import { DotField } from './reactbits/DotField';
import { useDeviceStore } from '../store/deviceStore';

const FOOTER_HINTS: Record<string, string> = {
  '/': '[↑↓] Navigate   [Enter] Select   [Esc] Reset',
  '/flasher': '[Click] Toggle partitions   [Flash] Start operation',
  '/tools': '[Click] Run a tool   [Enter] Confirm actions',
  '/log': '[Filter] Level   [Auto] Autoscroll   [Size] Font size',
  '/settings': '[Dropdown] Change theme   [Browse] Select files',
};

export function Layout() {
  const location = useLocation();
  const isConnected = useDeviceStore((state) => state.isConnected);
  const isConnecting = useDeviceStore((state) => state.isConnecting);
  const hint =
    location.pathname === '/' && (isConnected || isConnecting)
      ? '[Click] Toggle partitions   [Backup] Run operations'
      : FOOTER_HINTS[location.pathname] ?? FOOTER_HINTS['/'];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]">
        <DotField dotSpacing={26} cursorRadius={320} bulgeStrength={45} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.06),transparent_60%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <PageHeader />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
        <footer className="flex h-7 flex-shrink-0 items-center justify-center border-t border-border bg-surface/60 font-mono text-[11px] text-muted-foreground backdrop-blur-sm">
          {hint}
        </footer>
      </div>
      <ErrorBanner />
    </div>
  );
}