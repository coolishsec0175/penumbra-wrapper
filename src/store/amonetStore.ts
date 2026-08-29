import { create } from 'zustand';
import type { AmonetEvent, PayloadType, SerialPortInfo } from '../types/amonet';

interface AmonetState {
  ports: SerialPortInfo[];
  selectedPort: string | null;
  payloadType: PayloadType;
  customPayloadPath: string | null;
  baudRate: number;
  timeoutMs: number;
  isRunning: boolean;
  events: AmonetEvent[];
  error: string | null;

  setPorts: (ports: SerialPortInfo[]) => void;
  setSelectedPort: (port: string | null) => void;
  setPayloadType: (type: PayloadType) => void;
  setCustomPayloadPath: (path: string | null) => void;
  setBaudRate: (rate: number) => void;
  setTimeoutMs: (ms: number) => void;
  setRunning: (running: boolean) => void;
  addEvent: (event: AmonetEvent) => void;
  clearEvents: () => void;
  setError: (error: string | null) => void;
  clearState: () => void;
}

export const useAmonetStore = create<AmonetState>((set) => ({
  ports: [],
  selectedPort: null,
  payloadType: 'brom_defuse',
  customPayloadPath: null,
  baudRate: 115200,
  timeoutMs: 30000,
  isRunning: false,
  events: [],
  error: null,

  setPorts: (ports) => set({ ports }),
  setSelectedPort: (selectedPort) => set({ selectedPort }),
  setPayloadType: (payloadType) => set({ payloadType }),
  setCustomPayloadPath: (customPayloadPath) => set({ customPayloadPath }),
  setBaudRate: (baudRate) => set({ baudRate }),
  setTimeoutMs: (timeoutMs) => set({ timeoutMs }),
  setRunning: (isRunning) => set({ isRunning }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  clearEvents: () => set({ events: [] }),
  setError: (error) => set({ error }),
  clearState: () =>
    set({
      ports: [],
      selectedPort: null,
      customPayloadPath: null,
      isRunning: false,
      events: [],
      error: null,
    }),
}));
