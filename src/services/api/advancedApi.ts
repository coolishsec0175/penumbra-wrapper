import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Options for raw memory / flash offset operations.
 */
export interface MemoryOperationOptions {
  daPath: string;
  address: string;
  filePath: string;
  length?: string;
  preloaderPath?: string;
  operationId?: string;
}

/**
 * Options for RPMB operations.
 */
export interface RpmbOperationOptions {
  daPath: string;
  filePath?: string;
  key?: string;
  region?: number;
  startSector?: number;
  numSectors?: number;
  preloaderPath?: string;
  operationId?: string;
}

/**
 * Advanced API service - Raw memory, offset, RPMB, and boot slot operations.
 * Mirrors the corresponding antumbra CLI commands.
 */
export class AdvancedApi {
  /**
   * Read memory from an address (peek).
   */
  static async peek(options: MemoryOperationOptions): Promise<void> {
    if (!options.length) {
      throw new Error('Length is required for peek');
    }
    return invoke('peek_memory', {
      daPath: options.daPath,
      address: options.address,
      length: options.length,
      outputPath: options.filePath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Write data to a memory address (poke).
   */
  static async poke(options: MemoryOperationOptions): Promise<void> {
    return invoke('poke_memory', {
      daPath: options.daPath,
      address: options.address,
      inputPath: options.filePath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Read device flash from a raw offset.
   */
  static async readOffset(options: MemoryOperationOptions): Promise<void> {
    if (!options.length) {
      throw new Error('Length is required for read-offset');
    }
    return invoke('read_offset', {
      daPath: options.daPath,
      address: options.address,
      length: options.length,
      outputPath: options.filePath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Write device flash to a raw offset.
   */
  static async writeOffset(options: MemoryOperationOptions): Promise<void> {
    if (!options.length) {
      throw new Error('Length is required for write-offset');
    }
    return invoke('write_offset', {
      daPath: options.daPath,
      address: options.address,
      length: options.length,
      inputPath: options.filePath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Read from the RPMB partition.
   */
  static async rpmbRead(options: RpmbOperationOptions): Promise<void> {
    if (!options.filePath) {
      throw new Error('Output file is required for RPMB read');
    }
    return invoke('rpmb_read', {
      daPath: options.daPath,
      outputPath: options.filePath,
      region: options.region ?? null,
      startSector: options.startSector ?? null,
      numSectors: options.numSectors ?? null,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Write to the RPMB partition.
   */
  static async rpmbWrite(options: RpmbOperationOptions): Promise<void> {
    if (!options.filePath) {
      throw new Error('Input file is required for RPMB write');
    }
    return invoke('rpmb_write', {
      daPath: options.daPath,
      inputPath: options.filePath,
      region: options.region ?? null,
      startSector: options.startSector ?? null,
      numSectors: options.numSectors ?? null,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Authenticate with the RPMB partition using a hex key.
   */
  static async rpmbAuth(options: RpmbOperationOptions): Promise<void> {
    if (!options.key) {
      throw new Error('Authentication key is required for RPMB auth');
    }
    return invoke('rpmb_auth', {
      daPath: options.daPath,
      key: options.key,
      region: options.region ?? null,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

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
