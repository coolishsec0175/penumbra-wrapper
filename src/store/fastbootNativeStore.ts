import { create } from 'zustand';
import type { FastbootDeviceInfo, FastbootVar } from '../types/fastboot_native';

interface FastbootNativeState {
  devices: FastbootDeviceInfo[];
  selectedDevice: string | null;
  variables: FastbootVar[];
  isLoading: boolean;
  error: string | null;

  setDevices: (devices: FastbootDeviceInfo[]) => void;
  setSelectedDevice: (serial: string | null) => void;
  setVariables: (variables: FastbootVar[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearState: () => void;
}

export const useFastbootNativeStore = create<FastbootNativeState>((set) => ({
  devices: [],
  selectedDevice: null,
  variables: [],
  isLoading: false,
  error: null,

  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  setVariables: (variables) => set({ variables }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearState: () =>
    set({
      devices: [],
      selectedDevice: null,
      variables: [],
      isLoading: false,
      error: null,
    }),
}));
