import { create } from 'zustand';
import type { MtkStatus } from '../types/mtkclient';

interface MtkClientState {
  // Status
  status: MtkStatus | null;
  isLoading: boolean;
  error: string | null;

  // Connection
  isRunning: boolean;
  isIotMode: boolean;

  // Actions
  setStatus: (status: MtkStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRunning: (running: boolean) => void;
  setIotMode: (iot: boolean) => void;
  clearState: () => void;
}

export const useMtkClientStore = create<MtkClientState>((set) => ({
  // Status
  status: null,
  isLoading: false,
  error: null,

  // Connection
  isRunning: false,
  isIotMode: false,

  // Actions
  setStatus: (status) => set({ status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setRunning: (isRunning) => set({ isRunning }),
  setIotMode: (isIotMode) => set({ isIotMode }),
  clearState: () =>
    set({
      status: null,
      isLoading: false,
      error: null,
      isRunning: false,
    }),
}));
