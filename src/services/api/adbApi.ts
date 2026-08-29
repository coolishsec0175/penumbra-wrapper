import { invoke } from '@tauri-apps/api/core';
import type { AdbDeviceInfo, AdbShellResult } from '../../types/adb';

/**
 * ADB API service - Android Debug Bridge operations
 */
export class AdbApi {
  static async listDevices(): Promise<AdbDeviceInfo[]> {
    return invoke('adb_list_devices');
  }

  static async shellCommand(serial: string, command: string): Promise<AdbShellResult> {
    return invoke('adb_shell_command', { serial, command });
  }

  static async getDeviceProps(serial: string): Promise<Record<string, string>> {
    return invoke('adb_get_device_props', { serial });
  }

  static async reboot(serial: string, mode: string): Promise<void> {
    return invoke('adb_reboot', { serial, mode });
  }

  static async push(serial: string, localPath: string, remotePath: string): Promise<string> {
    return invoke('adb_push', { serial, localPath, remotePath });
  }

  static async pull(serial: string, remotePath: string, localPath: string): Promise<string> {
    return invoke('adb_pull', { serial, remotePath, localPath });
  }

  static async logcat(serial: string, lines?: number): Promise<string> {
    return invoke('adb_logcat', { serial, lines: lines || null });
  }

  static async sideload(serial: string, filePath: string): Promise<string> {
    return invoke('adb_sideload', { serial, filePath });
  }
}
