import { invoke } from '@tauri-apps/api/core';
import type { MtkDeviceInfo, MtkPartitionInfo, MtkBootCtrl } from '../../types';

export class MtkApi {
  static async listKnownPorts(): Promise<string[]> {
    return invoke('mtk_list_known_ports');
  }

  static async findPort(serialPort: string): Promise<void> {
    return invoke('mtk_find_port', { serialPort });
  }

  static async connect(serialPort: string, baudRate: number): Promise<void> {
    return invoke('mtk_connect', { serialPort, baudRate });
  }

  static async disconnect(): Promise<void> {
    return invoke('mtk_disconnect');
  }

  static async getDeviceInfo(): Promise<MtkDeviceInfo> {
    return invoke('mtk_get_device_info');
  }

  static async getPartitions(): Promise<MtkPartitionInfo[]> {
    return invoke('mtk_get_partitions');
  }

  static async enterDaMode(daPath: string): Promise<void> {
    return invoke('mtk_enter_da_mode', { daPath });
  }

  static async readPartition(partition: string, size: number, outputPath: string): Promise<void> {
    return invoke('mtk_read_partition', { partition, size, outputPath });
  }

  static async writePartition(partition: string, inputPath: string): Promise<void> {
    return invoke('mtk_write_partition', { partition, inputPath });
  }

  static async erasePartition(partition: string): Promise<void> {
    return invoke('mtk_erase_partition', { partition });
  }

  static async formatPartition(partition: string): Promise<void> {
    return invoke('mtk_format_partition', { partition });
  }

  static async reboot(): Promise<void> {
    return invoke('mtk_reboot');
  }

  static async shutdown(): Promise<void> {
    return invoke('mtk_shutdown');
  }

  static async seccfgLock(lock: boolean): Promise<void> {
    return invoke('mtk_seccfg_lock', { lock });
  }

  static async peek(address: number, size: number): Promise<number[]> {
    return invoke('mtk_peek', { address, size });
  }

  static async poke(address: number, value: number): Promise<void> {
    return invoke('mtk_poke', { address, value });
  }

  static async readOffset(address: number, size: number, outputPath: string): Promise<void> {
    return invoke('mtk_read_offset', { address, size, outputPath });
  }

  static async writeOffset(address: number, inputPath: string): Promise<void> {
    return invoke('mtk_write_offset', { address, inputPath });
  }

  static async download(address: number, inputPath: string): Promise<void> {
    return invoke('mtk_download', { address, inputPath });
  }

  static async upload(address: number, size: number, outputPath: string): Promise<void> {
    return invoke('mtk_upload', { address, size, outputPath });
  }

  static async readRpmb(region: string, offset: number, size: number, outputPath: string): Promise<void> {
    return invoke('mtk_read_rpmb', { region, offset, size, outputPath });
  }

  static async writeRpmb(region: string, offset: number, inputPath: string): Promise<void> {
    return invoke('mtk_write_rpmb', { region, offset, inputPath });
  }

  static async authRpmb(keyHex: string, region: string): Promise<void> {
    return invoke('mtk_auth_rpmb', { keyHex, region });
  }

  static async wipeRpmb(region: string, sectorCount: number): Promise<void> {
    return invoke('mtk_wipe_rpmb', { region, sectorCount });
  }

  static async provisionRpmb(keyHex: string, region: string): Promise<void> {
    return invoke('mtk_provision_rpmb', { keyHex, region });
  }

  static async readFlash(size: number, outputPath: string): Promise<void> {
    return invoke('mtk_read_flash', { size, outputPath });
  }

  static async writeFlash(inputPath: string): Promise<void> {
    return invoke('mtk_write_flash', { inputPath });
  }

  static async getBootctrl(): Promise<MtkBootCtrl> {
    return invoke('mtk_get_bootctrl');
  }
}
