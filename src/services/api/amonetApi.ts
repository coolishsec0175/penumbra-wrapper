import { invoke } from '@tauri-apps/api/core';
import type { PayloadType, SerialPortInfo } from '../../types/amonet';

/**
 * Amonet API service - MTK BROM exploit and payload operations
 */
export class AmonetApi {
  static async scanPorts(): Promise<SerialPortInfo[]> {
    return invoke('amonet_scan_ports');
  }

  static async execute(
    payloadType: PayloadType,
    port?: string,
    baudRate?: number,
    timeoutMs?: number,
    customPayloadPath?: string
  ): Promise<string> {
    return invoke('amonet_execute', {
      payloadType,
      port: port || null,
      baudRate: baudRate || null,
      timeoutMs: timeoutMs || null,
      customPayloadPath: customPayloadPath || null,
    });
  }

  static async cancel(): Promise<void> {
    return invoke('amonet_cancel');
  }
}
