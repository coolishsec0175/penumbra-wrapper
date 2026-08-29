export interface AdbDeviceInfo {
  serial: string;
  state: string;
  product: string | null;
  model: string | null;
  device: string | null;
  transport_id: string | null;
}

export interface AdbShellResult {
  exit_code: number;
  stdout: string;
  stderr: string;
}

export interface AdbFileTransfer {
  local_path: string;
  remote_path: string;
  bytes_transferred: number;
  total_bytes: number;
  complete: boolean;
}
