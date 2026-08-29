export interface AmonetConfig {
  exploit_type: ExploitType;
  port: string | null;
  baud_rate: number;
  payload_path: string | null;
  timeout_ms: number;
}

export type ExploitType = 'kamakiri_v1' | 'kamakiri_v2' | 'amonet' | 'bruteforce';

export type AmonetStatus =
  | 'scanning'
  | 'connecting'
  | 'handshake'
  | 'exploiting'
  | 'payload_sent'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface AmonetEvent {
  status: AmonetStatus;
  message: string;
  progress: number | null;
}

export interface SerialPortInfo {
  port_name: string;
  description: string;
  vid: number;
  pid: number;
}
