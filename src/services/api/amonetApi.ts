import { invoke } from '@tauri-apps/api/core';
import type { SerialPortInfo } from '../../types/amonet';

/**
 * Amonet API service - MTK BROM exploit operations
 */
export class AmonetApi {
  static async scanPorts(): Promise<SerialPortInfo[]> {
    return invoke('amonet_scan_ports');
  }

  static async execute(
    exploitType: string,
    port?: string,
    baudRate?: number,
    timeoutMs?: number
  ): Promise<string> {
    return invoke('amonet_execute', {
      exploitType,
      port: port || null,
      baudRate: baudRate || null,
      timeoutMs: timeoutMs || null,
    });
  }

  static async cancel(): Promise<void> {
    return invoke('amonet_cancel');
  }
}
