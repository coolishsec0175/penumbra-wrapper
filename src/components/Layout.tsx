/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet, NavLink } from 'react-router-dom';
import { Terminal, Grid, FileStack, Wrench, Settings, Sun, Moon, Zap, PanelLeftClose, PanelLeftOpen, MoonStar } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useFlasherStore } from '../store/flasherStore';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Grid, end: true },
  { to: '/flasher', label: 'Flasher', icon: FileStack, end: false },
  { to: '/tools', label: 'Tools', icon: Wrench, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

export function Layout() {
  const toggleLogPanel = useUIStore((state) => state.toggleLogPanel);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const { isFlashing, currentFlashIndex, totalFlashCount, flashModalMinimized, openFlashModal } = useFlasherStore();

  const handleFlashIndicatorClick = () => {
    openFlashModal();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <nav
        className={cn(
          'flex flex-col border-r border-border bg-surface transition-[width] duration-200',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className={cn('flex items-center gap-3 border-b border-border p-4', sidebarCollapsed && 'justify-center px-2')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
            <MoonStar className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Penumbra
              </h1>
              <p className="mt-0.5 truncate text-xs text-subtle-foreground">MediaTek Flash Tool</p>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {!sidebarCollapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Main
            </p>
          )}
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                  sidebarCollapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="font-medium">{label}</span>}
            </NavLink>
          ))}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          {isFlashing && flashModalMinimized && (
            <Button
              onClick={handleFlashIndicatorClick}
              variant="warning"
              className={cn('w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
              title="Show flash progress"
            >
              <Zap className="h-5 w-5 shrink-0 animate-pulse" />
              {!sidebarCollapsed && (
                <span className="font-medium">
                  Flashing {currentFlashIndex}/{totalFlashCount}
                </span>
              )}
            </Button>
          )}
          <Button
            onClick={toggleTheme}
            variant="outline"
            className={cn('w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
            {!sidebarCollapsed && <span className="font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </Button>
          <Button
            onClick={toggleLogPanel}
            variant="outline"
            className={cn('w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
            title="Toggle logs"
          >
            <Terminal className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Logs</span>}
          </Button>
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            variant="ghost"
            className={cn('w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0" />
            ) : (
              <PanelLeftClose className="h-5 w-5 shrink-0" />
            )}
            {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
          </Button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
