export interface FastbootDeviceInfo {
  serial: string;
  usb_path: string | null;
  is_unlocked: boolean;
  is_dynamic: boolean;
  current_slot: string | null;
}

export interface FastbootVar {
  name: string;
  value: string;
}

export interface FastbootFlashResult {
  success: boolean;
  message: string;
  partition: string;
  bytes_written: number;
}
