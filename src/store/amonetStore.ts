import { create } from 'zustand';
import type { AmonetEvent, SerialPortInfo } from '../types/amonet';

interface AmonetState {
  ports: SerialPortInfo[];
  selectedPort: string | null;
  exploitType: string;
  isRunning: boolean;
  events: AmonetEvent[];
  error: string | null;

  setPorts: (ports: SerialPortInfo[]) => void;
  setSelectedPort: (port: string | null) => void;
  setExploitType: (type: string) => void;
  setRunning: (running: boolean) => void;
  addEvent: (event: AmonetEvent) => void;
  clearEvents: () => void;
  setError: (error: string | null) => void;
  clearState: () => void;
}

export const useAmonetStore = create<AmonetState>((set) => ({
  ports: [],
  selectedPort: null,
  exploitType: 'kamakiri_v2',
  isRunning: false,
  events: [],
  error: null,

  setPorts: (ports) => set({ ports }),
  setSelectedPort: (selectedPort) => set({ selectedPort }),
  setExploitType: (exploitType) => set({ exploitType }),
  setRunning: (isRunning) => set({ isRunning }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  clearEvents: () => set({ events: [] }),
  setError: (error) => set({ error }),
  clearState: () =>
    set({
      ports: [],
      selectedPort: null,
      isRunning: false,
      events: [],
      error: null,
    }),
}));
