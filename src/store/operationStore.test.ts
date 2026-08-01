import { describe, it, expect, beforeEach } from 'vitest';
import { useOperationStore } from './operationStore';

describe('operationStore', () => {
  beforeEach(() => {
    useOperationStore.getState().clearOperation();
    useOperationStore.getState().clearLogs();
  });

  it('starts an operation', () => {
    const store = useOperationStore.getState();
    store.startOperation('read', 'super');
    const state = useOperationStore.getState();
    expect(state.type).toBe('read');
    expect(state.partitionName).toBe('super');
    expect(state.isRunning).toBe(true);
  });

  it('tracks streaming by operation id', () => {
    const store = useOperationStore.getState();
    store.startOperation('write', 'boot_a', undefined, 'op-123');
    const state = useOperationStore.getState();
    expect(state.operationId).toBe('op-123');
    expect(state.isStreaming).toBe(true);
  });

  it('adds logs and assigns ids', () => {
    const store = useOperationStore.getState();
    store.addLog({ timestamp: '2026-01-01T00:00:00.000Z', level: 'info', message: 'hello' });
    const state = useOperationStore.getState();
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].message).toBe('hello');
    expect(state.logs[0].id).toBeTruthy();
  });

  it('deduplicates identical logs within 500ms', () => {
    const store = useOperationStore.getState();
    store.addLog({ timestamp: '2026-01-01T00:00:00.000Z', level: 'info', message: 'dup' });
    store.addLog({ timestamp: '2026-01-01T00:00:00.100Z', level: 'info', message: 'dup' });
    expect(useOperationStore.getState().logs).toHaveLength(1);
  });

  it('finishes operations with errors', () => {
    const store = useOperationStore.getState();
    store.startOperation('read', 'super');
    store.finishOperation(false, 'timed out');
    const state = useOperationStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.error).toBe('timed out');
    expect(state.isStreaming).toBe(false);
  });

  it('clears operation state', () => {
    const store = useOperationStore.getState();
    store.startOperation('read', 'super');
    store.clearOperation();
    const state = useOperationStore.getState();
    expect(state.type).toBeNull();
    expect(state.partitionName).toBeNull();
    expect(state.logs).toHaveLength(0);
  });
});
