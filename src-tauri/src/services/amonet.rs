/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

//! Amonet - MTK BROM exploit and payload loader
//!
//! Integrates with shomykohai/mtk-payloads for:
//! - brom_defuse: BROM security bypass (Legacy/V5, kamakiri2)
//! - extloader: DA extension loader (V5 + V6)
//! - hakujoudai: V6 heap exploit payload
//! - sla_xml: SLA bypass for V6 devices
//! - da_x: DA extensions for V5/XFlash
//! - da_xml: DA extensions for V6/XML
//!
//! Uses USB serial communication via the serialport crate.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

static AMONET_RUNNING: AtomicBool = AtomicBool::new(false);
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

/// Payload types from shomykohai/mtk-payloads
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PayloadType {
    /// BROM security bypass for Legacy/V5 devices (kamakiri2 exploit)
    BromDefuse,
    /// DA extension loader for V5 devices (restores boot_to command)
    ExtloaderV5,
    /// DA extension loader for V6 ARM32
    ExtloaderV6Arm,
    /// DA extension loader for V6 AArch64
    ExtloaderV6Arm64,
    /// V6 heap exploit payload ARM32
    HakujoudaiArm,
    /// V6 heap exploit payload AArch64
    HakujoudaiArm64,
    /// SLA bypass for V6 ARM32
    SlaXmlArm,
    /// SLA bypass for V6 AArch64
    SlaXmlArm64,
}

impl PayloadType {
    pub fn filename(&self) -> &str {
        match self {
            PayloadType::BromDefuse => "brom_defuse.bin",
            PayloadType::ExtloaderV5 => "extloader_v5.bin",
            PayloadType::ExtloaderV6Arm => "extloaderv6_arm.bin",
            PayloadType::ExtloaderV6Arm64 => "extloaderv6_arm64.bin",
            PayloadType::HakujoudaiArm => "hakujoudai_arm.bin",
            PayloadType::HakujoudaiArm64 => "hakujoudai_arm64.bin",
            PayloadType::SlaXmlArm => "sla_xml_arm.bin",
            PayloadType::SlaXmlArm64 => "sla_xml_arm64.bin",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            PayloadType::BromDefuse => "BROM Defuse (Legacy/V5)",
            PayloadType::ExtloaderV5 => "Extloader V5",
            PayloadType::ExtloaderV6Arm => "Extloader V6 (ARM32)",
            PayloadType::ExtloaderV6Arm64 => "Extloader V6 (ARM64)",
            PayloadType::HakujoudaiArm => "Hakujoudai (ARM32)",
            PayloadType::HakujoudaiArm64 => "Hakujoudai (ARM64)",
            PayloadType::SlaXmlArm => "SLA XML (ARM32)",
            PayloadType::SlaXmlArm64 => "SLA XML (ARM64)",
        }
    }

    pub fn description(&self) -> &str {
        match self {
            PayloadType::BromDefuse => "Disables SLA/DAA/SBC security checks in BootROM. For legacy and V5 devices using kamakiri2 exploit.",
            PayloadType::ExtloaderV5 => "Restores boot_to command to V5 DAs. Loads DA extensions via com_channel_struct.",
            PayloadType::ExtloaderV6Arm => "DA extension loader for V6 XML devices (ARM32). Uses XML protocol.",
            PayloadType::ExtloaderV6Arm64 => "DA extension loader for V6 XML devices (ARM64). Uses XML protocol.",
            PayloadType::HakujoudaiArm => "V6 heap exploit (heapb8 vulnerability). Enables arbitrary memory read/write and function calls.",
            PayloadType::HakujoudaiArm64 => "V6 heap exploit (heapb8 vulnerability) for AArch64. Enables arbitrary memory read/write.",
            PayloadType::SlaXmlArm => "SLA bypass for V6 XML devices (ARM32). Makes device accept dummy SLA authentication.",
            PayloadType::SlaXmlArm64 => "SLA bypass for V6 XML devices (ARM64). Makes device accept dummy SLA authentication.",
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::BromDefuse,
            Self::ExtloaderV5,
            Self::ExtloaderV6Arm,
            Self::ExtloaderV6Arm64,
            Self::HakujoudaiArm,
            Self::HakujoudaiArm64,
            Self::SlaXmlArm,
            Self::SlaXmlArm64,
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmonetConfig {
    pub payload_type: PayloadType,
    pub port: Option<String>,
    pub baud_rate: u32,
    pub custom_payload_path: Option<String>,
    pub timeout_ms: u64,
}

impl Default for AmonetConfig {
    fn default() -> Self {
        Self {
            payload_type: PayloadType::BromDefuse,
            port: None,
            baud_rate: 115200,
            custom_payload_path: None,
            timeout_ms: 30000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AmonetStatus {
    Scanning,
    Connecting,
    Handshake,
    LoadingPayload,
    SendingPayload,
    WaitingResponse,
    Success,
    Failed(String),
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmonetEvent {
    pub status: AmonetStatus,
    pub message: String,
    pub progress: Option<f32>,
}

/// MTK USB VCOM VID
const MTK_VID: u16 = 0x0E8D;

/// MTK BROM handshake magic
const BROM_HANDSHAKE_MAGIC: [u8; 4] = [0xA0, 0x0A, 0x00, 0x00];

/// DA protocol magic header
const DA_MAGIC: [u8; 2] = [0xA0, 0xA0];

pub struct AmonetExploit {
    config: AmonetConfig,
}

impl AmonetExploit {
    pub fn new(config: AmonetConfig) -> Self {
        Self { config }
    }

    /// Get the payloads directory path
    fn get_payloads_dir(app_dir: Option<&PathBuf>) -> PathBuf {
        if let Some(dir) = app_dir {
            dir.join("payloads")
        } else {
            // Default: look in current directory
            PathBuf::from("payloads")
        }
    }

    /// Load payload bytes from file or embedded
    fn load_payload(
        &self,
        payload_type: &PayloadType,
        app_dir: Option<&PathBuf>,
    ) -> Result<Vec<u8>> {
        // Check custom payload path first
        if let Some(ref custom_path) = self.config.custom_payload_path {
            let path = PathBuf::from(custom_path);
            if path.exists() {
                log::info!("Loading custom payload from {:?}", path);
                return std::fs::read(&path).context("Failed to read custom payload");
            }
        }

        // Check payloads directory
        let payloads_dir = Self::get_payloads_dir(app_dir);
        let payload_path = payloads_dir.join(payload_type.filename());

        if payload_path.exists() {
            log::info!("Loading payload from {:?}", payload_path);
            return std::fs::read(&payload_path).context("Failed to read payload file");
        }

        // Return empty if not found - user needs to download payloads
        log::warn!(
            "Payload {} not found at {:?}",
            payload_type.filename(),
            payload_path
        );
        anyhow::bail!(
            "Payload file '{}' not found. Download payloads from https://github.com/shomykohai/mtk-payloads and place them in the payloads/ directory.",
            payload_type.filename()
        )
    }

    /// Scan for MTK USB serial ports
    pub fn scan_ports() -> Result<Vec<SerialPortInfo>> {
        let ports = serialport::available_ports().context("Failed to enumerate serial ports")?;

        let mtk_ports: Vec<SerialPortInfo> = ports
            .into_iter()
            .filter(|p| match &p.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    info.vid == MTK_VID
                        || info.pid == 0x0003
                        || info.pid == 0x0023
                        || info.pid == 0x2000
                        || info.pid == 0x2001
                }
                _ => false,
            })
            .collect();

        Ok(mtk_ports)
    }

    /// Execute the exploit
    pub async fn execute(
        &self,
        callback: Arc<Mutex<dyn FnMut(AmonetEvent) + Send>>,
    ) -> Result<()> {
        CANCEL_FLAG.store(false, Ordering::SeqCst);
        AMONET_RUNNING.store(true, Ordering::SeqCst);

        let result = self.run_exploit(callback.clone()).await;

        AMONET_RUNNING.store(false, Ordering::SeqCst);

        if CANCEL_FLAG.load(Ordering::SeqCst) {
            if let Ok(mut cb) = callback.lock() {
                cb(AmonetEvent {
                    status: AmonetStatus::Cancelled,
                    message: "Operation cancelled by user".to_string(),
                    progress: None,
                });
            }
            anyhow::bail!("Operation cancelled");
        }

        result
    }

    async fn run_exploit(
        &self,
        callback: Arc<Mutex<dyn FnMut(AmonetEvent) + Send>>,
    ) -> Result<()> {
        let emit = |status: AmonetStatus, msg: &str, progress: Option<f32>| {
            if let Ok(mut cb) = callback.lock() {
                cb(AmonetEvent {
                    status,
                    message: msg.to_string(),
                    progress,
                });
            }
        };

        // Step 1: Scan for ports
        emit(
            AmonetStatus::Scanning,
            "Scanning for MTK devices...",
            Some(0.0),
        );

        let ports = Self::scan_ports()?;
        let port_info = if let Some(ref port_name) = self.config.port {
            ports.iter().find(|p| &p.port_name == port_name)
        } else {
            ports.first()
        };

        let port_name = match port_info {
            Some(p) => p.port_name.clone(),
            None => {
                emit(
                    AmonetStatus::Failed("No MTK device found".to_string()),
                    "No MTK USB serial port detected. Ensure device is in BootROM mode.",
                    None,
                );
                anyhow::bail!("No MTK device found");
            }
        };

        // Step 2: Load payload
        emit(
            AmonetStatus::LoadingPayload,
            &format!(
                "Loading {} payload...",
                self.config.payload_type.display_name()
            ),
            Some(0.1),
        );

        let payload = self.load_payload(&self.config.payload_type, None)?;

        if payload.is_empty() {
            emit(
                AmonetStatus::Failed("Empty payload".to_string()),
                "Payload file is empty",
                None,
            );
            anyhow::bail!("Payload file is empty");
        }

        emit(
            AmonetStatus::LoadingPayload,
            &format!("Payload loaded ({} bytes)", payload.len()),
            Some(0.15),
        );

        // Step 3: Open serial port
        emit(
            AmonetStatus::Connecting,
            &format!("Opening {}...", port_name),
            Some(0.2),
        );

        let mut port = serialport::new(&port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(self.config.timeout_ms))
            .open()
            .context("Failed to open serial port")?;

        tokio::time::sleep(Duration::from_millis(100)).await;

        // Step 4: Preloader handshake
        emit(
            AmonetStatus::Handshake,
            "Sending preloader handshake...",
            Some(0.3),
        );

        self.send_handshake(&mut port)?;

        // Step 5: Wait for BROM response
        let mut response = vec![0u8; 64];
        let bytes_read = port.read(&mut response).unwrap_or(0);

        if bytes_read < 4 {
            emit(
                AmonetStatus::Failed("No response from BROM".to_string()),
                "Device did not respond to handshake. Ensure device is in BootROM mode.",
                None,
            );
            anyhow::bail!("No BROM response");
        }

        if response[..4] != BROM_HANDSHAKE_MAGIC {
            log::warn!(
                "Unexpected handshake response: {:02X?}",
                &response[..4.min(bytes_read)]
            );
        }

        // Step 6: Send payload
        emit(
            AmonetStatus::SendingPayload,
            &format!("Sending {} payload...", self.config.payload_type.display_name()),
            Some(0.5),
        );

        self.send_payload(&mut port, &payload)?;

        // Step 7: Wait for response
        emit(
            AmonetStatus::WaitingResponse,
            "Waiting for device response...",
            Some(0.8),
        );

        tokio::time::sleep(Duration::from_millis(500)).await;

        let mut exploit_response = vec![0u8; 512];
        let _read = port.read(&mut exploit_response).unwrap_or(0);

        // Check for ACK response (0xA0 0x01 for success)
        let success = exploit_response.windows(2).any(|w| w == [0xA0, 0x01])
            || exploit_response.iter().any(|&b| b == 0x01);

        if success {
            emit(
                AmonetStatus::Success,
                &format!(
                    "{} payload executed successfully!",
                    self.config.payload_type.display_name()
                ),
                Some(1.0),
            );
            Ok(())
        } else {
            emit(
                AmonetStatus::Failed("No ACK received".to_string()),
                &format!(
                    "Device did not acknowledge payload. Response: {:02X?}",
                    &exploit_response[..16.min(exploit_response.len())]
                ),
                None,
            );
            anyhow::bail!("No ACK from device after payload");
        }
    }

    fn send_handshake(&self, port: &mut Box<dyn serialport::SerialPort>) -> Result<()> {
        let handshake = [0xA0, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        port.write_all(&handshake)
            .context("Failed to send handshake")?;
        port.flush().context("Failed to flush handshake")?;
        Ok(())
    }

    fn send_payload(
        &self,
        port: &mut Box<dyn serialport::SerialPort>,
        payload: &[u8],
    ) -> Result<()> {
        // Send payload with DA protocol framing
        // Header: magic (2) + length (2) + checksum (2)
        let len = payload.len() as u16;
        let checksum: u16 = payload.iter().fold(0u16, |acc, &b| acc.wrapping_add(b as u16));

        let header = [
            DA_MAGIC[0],
            DA_MAGIC[1],
            (len & 0xFF) as u8,
            ((len >> 8) & 0xFF) as u8,
            (checksum & 0xFF) as u8,
            ((checksum >> 8) & 0xFF) as u8,
        ];

        port.write_all(&header)
            .context("Failed to send payload header")?;

        // Send payload in chunks
        let chunk_size = 512;
        for chunk in payload.chunks(chunk_size) {
            if CANCEL_FLAG.load(Ordering::SeqCst) {
                anyhow::bail!("Cancelled during payload transfer");
            }
            port.write_all(chunk)
                .context("Failed to send payload chunk")?;
            port.flush().context("Failed to flush payload chunk")?;
            std::thread::sleep(Duration::from_millis(5));
        }

        port.flush().context("Failed to flush final payload")?;
        Ok(())
    }
}

pub fn cancel_exploit() {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    AMONET_RUNNING.store(false, Ordering::SeqCst);
}

pub fn is_running() -> bool {
    AMONET_RUNNING.load(Ordering::SeqCst)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialPortInfo {
    pub port_name: String,
    pub description: String,
    pub vid: u16,
    pub pid: u16,
}
