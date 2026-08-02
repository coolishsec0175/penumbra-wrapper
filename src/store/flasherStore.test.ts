import { describe, it, expect, beforeEach } from 'vitest';
import { useFlasherStore } from './flasherStore';

describe('flasherStore', () => {
  beforeEach(() => {
    useFlasherStore.getState().clearFlasherState();
  });

  it('toggles partition selection', () => {
    const store = useFlasherStore.getState();
    store.togglePartitionSelection('super');
    expect(useFlasherStore.getState().selectedPartitions.has('super')).toBe(true);
    store.togglePartitionSelection('super');
    expect(useFlasherStore.getState().selectedPartitions.has('super')).toBe(false);
  });

  it('sets and updates partition images', () => {
    const store = useFlasherStore.getState();
    store.setPartitionImage('super', '/img/super.img');
    const state = useFlasherStore.getState();
    expect(state.partitionImages.get('super')).toBe('/img/super.img');
  });

  it('tracks flashing progress', () => {
    const store = useFlasherStore.getState();
    store.setFlashing(true, 1, 5);
    const state = useFlasherStore.getState();
    expect(state.isFlashing).toBe(true);
    expect(state.currentFlashIndex).toBe(1);
    expect(state.totalFlashCount).toBe(5);
  });

  it('updates flash index during progress', () => {
    const store = useFlasherStore.getState();
    store.setFlashing(true, 1, 5);
    store.updateFlashProgress(3);
    expect(useFlasherStore.getState().currentFlashIndex).toBe(3);
  });

  it('opens the flash modal and clears minimized state', () => {
    const store = useFlasherStore.getState();
    store.setFlashModalMinimized(true);
    store.openFlashModal();
    const state = useFlasherStore.getState();
    expect(state.showFlashModal).toBe(true);
    expect(state.flashModalMinimized).toBe(false);
  });

  it('clears flasher state', () => {
    const store = useFlasherStore.getState();
    store.setPartitionImage('super', '/img/super.img');
    store.setFlashing(true, 2, 4);
    store.clearFlasherState();
    const state = useFlasherStore.getState();
    expect(state.isFlashing).toBe(false);
    expect(state.scatterFile).toBeNull();
    expect(state.partitionImages.size).toBe(0);
    expect(state.selectedPartitions.size).toBe(0);
  });
});
