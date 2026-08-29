import { invoke } from '@tauri-apps/api/core';
import type { FastbootDeviceInfo, FastbootVar, FastbootFlashResult } from '../../types/fastboot_native';

/**
 * Fastboot Native API service - Fastboot protocol operations
 */
export class FastbootNativeApi {
  static async scanDevices(): Promise<FastbootDeviceInfo[]> {
    return invoke('fastboot_scan_devices');
  }

  static async getVar(varName: string): Promise<string> {
    return invoke('fastboot_get_var', { varName });
  }

  static async getAllVars(): Promise<FastbootVar[]> {
    return invoke('fastboot_get_all_vars');
  }

  static async flash(partition: string, filePath: string): Promise<FastbootFlashResult> {
    return invoke('fastboot_flash', { partition, filePath });
  }

  static async erase(partition: string): Promise<void> {
    return invoke('fastboot_erase', { partition });
  }

  static async boot(filePath: string): Promise<void> {
    return invoke('fastboot_boot', { filePath });
  }

  static async reboot(mode: string): Promise<void> {
    return invoke('fastboot_reboot', { mode });
  }

  static async setActiveSlot(slot: string): Promise<void> {
    return invoke('fastboot_set_active_slot', { slot });
  }

  static async oem(command: string): Promise<void> {
    return invoke('fastboot_oem', { command });
  }

  static async oemUnlock(): Promise<void> {
    return invoke('fastboot_oem_unlock');
  }

  static async oemLock(): Promise<void> {
    return invoke('fastboot_oem_lock');
  }

  static async waitForDevice(): Promise<void> {
    return invoke('fastboot_wait_for_device');
  }
}
