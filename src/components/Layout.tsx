/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet } from 'react-router-dom';
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';
import { ErrorBanner } from './layout/ErrorBanner';
import { DotField } from './reactbits/DotField';

export function Layout() {
  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]">
        <DotField dotSpacing={28} cursorRadius={280} bulgeStrength={35} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.04),transparent_60%)]" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>

      <ErrorBanner />
    </div>
  );
}
