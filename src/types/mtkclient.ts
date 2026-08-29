export interface MtkStatus {
  available: boolean;
  python_path: string;
  mtkclient_path: string;
  version: string | null;
  error: string | null;
}

export interface MtkDeviceInfo {
  chip: string | null;
  hw_code: string | null;
  hw_sub_code: string | null;
  hw_version: string | null;
  sw_version: string | null;
  boot_type: string | null;
  board: string | null;
  storage: string | null;
  ram: string | null;
}

export type MtkBootloaderAction = 'lock' | 'unlock';

export type MtkSlot = 'a' | 'b';

export interface MtkReadArgs {
  partition: string;
  outputFile: string;
  isIot: boolean;
  preloader?: string;
  daLoader?: string;
}

export interface MtkWriteArgs {
  partition: string;
  inputFile: string;
  isIot: boolean;
  preloader?: string;
  daLoader?: string;
}

export interface MtkEraseArgs {
  partition: string;
  isIot: boolean;
  preloader?: string;
  daLoader?: string;
}
