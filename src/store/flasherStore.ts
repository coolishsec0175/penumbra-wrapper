import { create } from 'zustand';
import type { ScatterFile } from '../types';

interface FlasherState {
  scatterFile: ScatterFile | null;
  isLoadingScatter: boolean;
  isConnecting: boolean;
  selectedPartitions: Set<string>;
  partitionImages: Map<string, string>;
  isFlashing: boolean;
  currentFlashIndex: number;
  totalFlashCount: number;
  flashModalMinimized: boolean;
  showFlashModal: boolean;
  
  // Actions
  setScatterFile: (file: ScatterFile | null) => void;
  setLoadingScatter: (loading: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setSelectedPartitions: (selected: Set<string>) => void;
  setPartitionImages: (images: Map<string, string>) => void;
  setPartitionImage: (partition: string, imagePath: string) => void;
  togglePartitionSelection: (partition: string) => void;
  clearFlasherState: () => void;
  setFlashing: (flashing: boolean, index?: number, total?: number) => void;
  updateFlashProgress: (index: number) => void;
  setFlashModalMinimized: (minimized: boolean) => void;
  setFlashModalOpen: (open: boolean) => void;
  openFlashModal: () => void;
}

export const useFlasherStore = create<FlasherState>((set, get) => ({
  scatterFile: null,
  isLoadingScatter: false,
  isConnecting: false,
  selectedPartitions: new Set(),
  partitionImages: new Map(),
  isFlashing: false,
  currentFlashIndex: 0,
  totalFlashCount: 0,
  flashModalMinimized: false,
  showFlashModal: false,
  
  setScatterFile: (file) => set({ scatterFile: file }),
  
  setLoadingScatter: (loading) => set({ isLoadingScatter: loading }),
  
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  
  setSelectedPartitions: (selected) => set({ selectedPartitions: selected }),
  
  setPartitionImages: (images) => set({ partitionImages: images }),
  
  setPartitionImage: (partition, imagePath) => {
    const images = new Map(get().partitionImages);
    images.set(partition, imagePath);
    set({ partitionImages: images });
  },
  
  togglePartitionSelection: (partition) => {
    const selected = new Set(get().selectedPartitions);
    if (selected.has(partition)) {
      selected.delete(partition);
    } else {
      selected.add(partition);
    }
    set({ selectedPartitions: selected });
  },
  
  clearFlasherState: () => set({
    scatterFile: null,
    selectedPartitions: new Set(),
    partitionImages: new Map(),
    isFlashing: false,
    currentFlashIndex: 0,
    totalFlashCount: 0,
    flashModalMinimized: false,
    showFlashModal: false,
  }),
  
  setFlashing: (flashing, index, total) => set({
    isFlashing: flashing,
    currentFlashIndex: index ?? 0,
    totalFlashCount: total ?? 0,
  }),
  
  updateFlashProgress: (index) => set({ currentFlashIndex: index }),
  
  setFlashModalMinimized: (minimized) => set({ flashModalMinimized: minimized }),
  
  setFlashModalOpen: (open) => set({ showFlashModal: open, flashModalMinimized: false }),
  
  openFlashModal: () => set({ showFlashModal: true, flashModalMinimized: false }),
}));
