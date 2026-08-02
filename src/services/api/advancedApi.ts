import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Advanced API service - Boot slot operations.
 * Mirrors the corresponding antumbra CLI commands.
 */
export class AdvancedApi {
  /**
   * Set the active boot slot (a or b).
   */
  static async setActiveSlot(
    daPath: string,
    slot: 'a' | 'b',
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('set_active_slot', {
      daPath,
      slot,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }
}
