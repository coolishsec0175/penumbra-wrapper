/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet } from 'react-router-dom';
import { PageHeader } from './layout/PageHeader';
import { ErrorBanner } from './layout/ErrorBanner';

export function Layout() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <PageHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <ErrorBanner />
    </div>
  );
}
