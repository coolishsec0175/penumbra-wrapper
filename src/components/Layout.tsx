/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet } from 'react-router-dom';
import { Sidebar } from './layout/Sidebar';
import { ErrorBanner } from './layout/ErrorBanner';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto p-3 lg:p-4 xl:p-5">
        <Outlet />
      </main>

      <ErrorBanner />
    </div>
  );
}
