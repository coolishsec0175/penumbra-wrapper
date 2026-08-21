/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

import { useNavigate } from 'react-router-dom';
import { FolderOpen, HardDrive, Shield, Zap } from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { Panel } from '../components/penumbra/Panel';
import { PageTransition } from '../components/ui/PageTransition';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { getBasename } from '../services/utils/pathUtils';

export function Dashboard() {
  const navigate = useNavigate();
  const { daPath, preloaderPath } = useDeviceStore();
  const { partitions } = usePartitionStore();
  const { isConnected, isConnecting } = useDeviceConnection();

  const connectedCount = partitions.length;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <PageTransition className="mx-auto w-full max-w-3xl space-y-5">
          {/* Greeting */}
          <div className="space-y-1">
            <h1 className="font-mono text-xl font-bold text-foreground">
              Good to see you!
            </h1>
            <p className="text-sm text-muted-foreground">
              {isConnected
                ? `Device connected with ${connectedCount} partitions detected.`
                : isConnecting
                  ? 'Connecting to device...'
                  : 'Connect a device to get started with partition management.'}
            </p>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-3 gap-3">
            <SpotlightCard className="overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft">
                  <Zap className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
                    DA Loader
                  </p>
                  <p className="truncate font-mono text-xs text-foreground">
                    {daPath ? getBasename(daPath) : 'Not selected'}
                  </p>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard className="overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-success-soft">
                  <HardDrive className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
                    Partitions
                  </p>
                  <p className="font-mono text-xs text-foreground">
                    {isConnected ? `${connectedCount} detected` : 'No device'}
                  </p>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard className="overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-warning-soft">
                  <Shield className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
                    Preloader
                  </p>
                  <p className="truncate font-mono text-xs text-foreground">
                    {preloaderPath ? getBasename(preloaderPath) : 'Optional'}
                  </p>
                </div>
              </div>
            </SpotlightCard>
          </div>

          {/* Backup card */}
          <SpotlightCard className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-surface-alt">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">No backup yet</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Back up your device partitions to prevent data loss.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/tools')}
                className="shrink-0 rounded-lg bg-primary-soft px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent transition-colors hover:bg-primary/20"
              >
                Back up now
              </button>
            </div>
          </SpotlightCard>

          {/* Quick actions */}
          <Panel title="QUICK ACTIONS" accent>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/pgpt')}
                disabled={!isConnected}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm transition-all hover:border-accent hover:bg-surface-hover disabled:opacity-40"
              >
                <Zap className="h-4 w-4 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Partition Manager</p>
                  <p className="text-[11px] text-muted-foreground">Read, write, format</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/flasher')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm transition-all hover:border-accent hover:bg-surface-hover"
              >
                <FolderOpen className="h-4 w-4 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Scatter Flasher</p>
                  <p className="text-[11px] text-muted-foreground">Flash firmware layouts</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/tools')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm transition-all hover:border-accent hover:bg-surface-hover"
              >
                <HardDrive className="h-4 w-4 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Backup & Restore</p>
                  <p className="text-[11px] text-muted-foreground">Full device backup</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm transition-all hover:border-accent hover:bg-surface-hover"
              >
                <Shield className="h-4 w-4 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Settings</p>
                  <p className="text-[11px] text-muted-foreground">Theme, paths, options</p>
                </div>
              </button>
            </div>
          </Panel>
        </PageTransition>
      </main>
    </div>
  );
}
