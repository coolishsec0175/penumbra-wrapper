/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet, useLocation } from 'react-router-dom';
import { PageHeader } from './layout/PageHeader';
import { ErrorBanner } from './layout/ErrorBanner';
import { Stars } from './penumbra/Stars';

const FOOTER_HINTS: Record<string, string> = {
  '/': '[↑↓] Navigate   [Enter] Select   [Esc] Back',
  '/flasher': '[Click] Toggle partitions   [Flash] Start operation',
  '/tools': '[Click] Run a tool   [Enter] Confirm actions',
  '/log': '[Filter] Level   [Auto] Autoscroll   [Size] Font size',
  '/settings': '[Dropdown] Change theme   [Browse] Select files',
};

export function Layout() {
  const location = useLocation();
  const hint = FOOTER_HINTS[location.pathname] ?? FOOTER_HINTS['/'];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Stars />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <PageHeader />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
        <footer className="flex h-7 flex-shrink-0 items-center justify-center border-t border-border bg-surface font-mono text-[11px] text-muted-foreground">
          {hint}
        </footer>
      </div>
      <ErrorBanner />
    </div>
  );
}
