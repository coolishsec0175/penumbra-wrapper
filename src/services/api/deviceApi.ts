import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import type { PartitionListResult } from '../../types';

/**
 * Device API service - Handles device connection and control operations.
 * Centralizes all Tauri invoke calls related to device management.
 */
export class DeviceApi {
  static async cancelOperation(): Promise<void> {
    return invoke('cancel_operation');
  }

  /**
   * Connect to device and retrieve partition list.
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param preloaderPath - Optional path to preloader file
   * @returns Promise resolving to partition list result
   * @throws Error if connection fails or device not found
   */
  static async connect(
    daPath: string,
    preloaderPath?: string
  ): Promise<PartitionListResult> {
    return invoke('list_partitions', {
      daPath,
      preloaderPath: preloaderPath || null,
    });
  }

  /**
   * Reboot device to the specified mode.
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param mode - Reboot mode: 'normal' for standard reboot, 'fastboot' for fastboot mode,
   *               'home-screen', 'meta', or 'test' for other modes
   * @param preloaderPath - Optional path to preloader file
   * @returns Promise resolving when reboot command is sent
   * @throws Error if reboot fails
   */
  static async reboot(
    daPath: string,
    mode: 'normal' | 'home-screen' | 'fastboot' | 'meta' | 'test',
    preloaderPath?: string
  ): Promise<void> {
    return invoke('reboot_device', {
      daPath,
      mode,
      preloaderPath: preloaderPath || null,
    });
  }

  /**
   * Shutdown the device gracefully.
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param preloaderPath - Optional path to preloader file
   * @returns Promise resolving when shutdown command is sent
   * @throws Error if shutdown fails
   */
  static async shutdown(
    daPath: string,
    preloaderPath?: string
  ): Promise<void> {
    return invoke('shutdown_device', {
      daPath,
      preloaderPath: preloaderPath || null,
    });
  }

  /**
   * Execute seccfg operation (lock/unlock bootloader).
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param action - 'unlock' or 'lock'
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async seccfgOperation(
    daPath: string,
    action: 'unlock' | 'lock',
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('seccfg_operation', {
      daPath,
      action,
      preloaderPath: preloaderPath || null,
      operationId: operationId || null,
    });
  }

  /**
   * Send the debug crash command to antumbra.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async crash(
    daPath: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('crash_command', {
      daPath,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Boot a custom preloader in BootROM (boot-pl command).
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param filePath - Path to the preloader file to boot
   * @param preloaderPath - Optional path to preloader file
   * @param address - Optional jump address (hex or decimal)
   * @param raw - Send file as raw binary instead of preloader format
   * @param operationId - Optional operation ID for tracking
   */
  static async bootPl(
    daPath: string,
    filePath: string,
    preloaderPath?: string,
    address?: string,
    raw?: boolean,
    operationId?: string
  ): Promise<void> {
    return invoke('boot_pl', {
      daPath,
      filePath,
      preloaderPath: preloaderPath || null,
      address: address || null,
      raw: raw || false,
      operationId: operationId || uuidv4(),
    });
  }
}
