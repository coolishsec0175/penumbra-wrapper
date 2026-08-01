/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { Outlet, NavLink } from 'react-router-dom';
import { Terminal, Grid, FileStack, Wrench, Sun, Moon, Zap } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useFlasherStore } from '../store/flasherStore';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function Layout() {
  const toggleLogPanel = useUIStore((state) => state.toggleLogPanel);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const { isFlashing, currentFlashIndex, totalFlashCount, flashModalMinimized, openFlashModal } = useFlasherStore();

  const handleFlashIndicatorClick = () => {
    openFlashModal();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <nav className="flex w-60 flex-col border-r border-border bg-surface">
        <div className="border-b border-border p-4">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
            Penumbra
          </h1>
          <p className="mt-1 text-xs text-subtle-foreground">MediaTek Flash Tool</p>
        </div>

        <div className="flex-1 space-y-2 p-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
              )
            }
          >
            <Grid className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to="/flasher"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
              )
            }
          >
            <FileStack className="h-5 w-5" />
            <span className="font-medium">Flasher</span>
          </NavLink>

          <NavLink
            to="/tools"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
              )
            }
          >
            <Wrench className="h-5 w-5" />
            <span className="font-medium">Tools</span>
          </NavLink>

        </div>

        <div className="space-y-2 border-t border-border p-3">
          {isFlashing && flashModalMinimized && (
            <Button
              onClick={handleFlashIndicatorClick}
              variant="warning"
              className="w-full justify-start"
              title="Show flash progress"
            >
              <Zap className="h-5 w-5 animate-pulse" />
              <span className="font-medium">
                Flashing {currentFlashIndex}/{totalFlashCount}
              </span>
            </Button>
          )}
          <Button onClick={toggleTheme} variant="outline" className="w-full justify-start" title="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </Button>
          <Button onClick={toggleLogPanel} variant="outline" className="w-full justify-start" title="Toggle logs">
            <Terminal className="h-5 w-5" />
            <span className="font-medium">Logs</span>
          </Button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
