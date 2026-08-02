import { invoke } from '@tauri-apps/api/core';

export class LogApi {
  /**
   * Export `content` to `path` on disk (used by the log panel Save button).
   */
  static async exportLogFile(path: string, content: string): Promise<void> {
    await invoke('export_log_file', { path, content });
  }
}
