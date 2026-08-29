import { create } from 'zustand';
import type { AdbDeviceInfo } from '../types/adb';

interface AdbState {
  devices: AdbDeviceInfo[];
  selectedDevice: string | null;
  isLoading: boolean;
  error: string | null;

  setDevices: (devices: AdbDeviceInfo[]) => void;
  setSelectedDevice: (serial: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearState: () => void;
}

export const useAdbStore = create<AdbState>((set) => ({
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,

  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearState: () =>
    set({
      devices: [],
      selectedDevice: null,
      isLoading: false,
      error: null,
    }),
}));
