import { invoke } from '@tauri-apps/api/core';
import type { FastbootResult } from '../../types';

export class FastbootApi {
  static async forceFastboot(): Promise<FastbootResult> {
    return invoke('force_fastboot');
  }

  static async cancelForceFastboot(): Promise<void> {
    return invoke('cancel_fastboot');
  }
}
