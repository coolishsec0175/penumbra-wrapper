/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet } from 'react-router-dom';
import { Sidebar } from './layout/Sidebar';
import { PageHeader } from './layout/PageHeader';
import { LogPanel } from './LogPanel';
import { ErrorBanner } from './layout/ErrorBanner';

export function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
      <LogPanel />
      <ErrorBanner />
    </div>
  );
}
