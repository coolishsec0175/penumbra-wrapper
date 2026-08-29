import { invoke } from '@tauri-apps/api/core';
import type { MtkStatus } from '../../types/mtkclient';

/**
 * MtkClient API service - Handles all mtkclient-related Tauri invoke calls.
 */
export class MtkClientApi {
  static async getStatus(isIot: boolean): Promise<MtkStatus> {
    return invoke('mtk_status', { isIot });
  }

  static async cancelOperation(): Promise<void> {
    return invoke('mtk_cancel_operation');
  }

  static async printGpt(
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_print_gpt', {
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async readPartition(
    partition: string,
    outputFile: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_read_partition', {
      partition,
      outputFile,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async writePartition(
    partition: string,
    inputFile: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_write_partition', {
      partition,
      inputFile,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async erasePartition(
    partition: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_erase_partition', {
      partition,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async dumpBrom(
    outputFile: string | null,
    isIot: boolean,
    preloader?: string
  ): Promise<string> {
    return invoke('mtk_dump_brom', {
      outputFile: outputFile || null,
      isIot,
      preloader: preloader || null,
    });
  }

  static async dumpPreloader(
    outputFile: string | null,
    isIot: boolean,
    preloader?: string
  ): Promise<string> {
    return invoke('mtk_dump_preloader', {
      outputFile: outputFile || null,
      isIot,
      preloader: preloader || null,
    });
  }

  static async dumpSram(
    outputFile: string | null,
    isIot: boolean,
    preloader?: string
  ): Promise<string> {
    return invoke('mtk_dump_sram', {
      outputFile: outputFile || null,
      isIot,
      preloader: preloader || null,
    });
  }

  static async crash(
    isIot: boolean,
    preloader?: string
  ): Promise<string> {
    return invoke('mtk_crash', {
      isIot,
      preloader: preloader || null,
    });
  }

  static async reboot(
    isIot: boolean,
    preloader?: string
  ): Promise<string> {
    return invoke('mtk_reboot', {
      isIot,
      preloader: preloader || null,
    });
  }

  static async seccfg(
    action: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_seccfg', {
      action,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async generateKeys(
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_generate_keys', {
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async readAll(
    outputDir: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_read_all', {
      outputDir,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async writeAll(
    inputDir: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_write_all', {
      inputDir,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }

  static async setActiveSlot(
    slot: string,
    isIot: boolean,
    preloader?: string,
    daLoader?: string
  ): Promise<string> {
    return invoke('mtk_set_active_slot', {
      slot,
      isIot,
      preloader: preloader || null,
      daLoader: daLoader || null,
    });
  }
}
