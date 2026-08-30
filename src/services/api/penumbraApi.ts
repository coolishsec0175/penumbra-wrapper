import { invoke } from '@tauri-apps/api/core'
import type { PenumbraUpdateInfo } from '../../types'

export class PenumbraApi {
  static async getVersion(): Promise<string> {
    return invoke('get_penumbra_version')
  }

  static async checkUpdate(): Promise<PenumbraUpdateInfo> {
    return invoke('check_penumbra_update')
  }
}
