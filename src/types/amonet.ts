export type PayloadType =
  | 'brom_defuse'
  | 'extloader_v5'
  | 'extloader_v6_arm'
  | 'extloader_v6_arm64'
  | 'hakujoudai_arm'
  | 'hakujoudai_arm64'
  | 'sla_xml_arm'
  | 'sla_xml_arm64'
  | 'da_x'
  | 'da_xml_arm'
  | 'da_xml_arm64';

export interface PayloadInfo {
  type: PayloadType;
  filename: string;
  displayName: string;
  description: string;
}

export interface AmonetConfig {
  payload_type: PayloadType;
  port: string | null;
  baud_rate: number;
  custom_payload_path: string | null;
  timeout_ms: number;
}

export type AmonetStatus =
  | 'scanning'
  | 'connecting'
  | 'handshake'
  | 'loading_payload'
  | 'sending_payload'
  | 'waiting_response'
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
