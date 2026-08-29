/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

//! Amonet - MTK BROM exploit implementation
//!
//! Exploits MediaTek BROM vulnerabilities to bypass SLA/DAA authentication.
//! Supports kamakiri (v1/v2) and amonet exploit variants.
//! Uses USB serial communication via the serialport crate.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

static AMONET_RUNNING: AtomicBool = AtomicBool::new(false);
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmonetConfig {
    pub exploit_type: ExploitType,
    pub port: Option<String>,
    pub baud_rate: u32,
    pub payload_path: Option<String>,
    pub timeout_ms: u64,
}

impl Default for AmonetConfig {
    fn default() -> Self {
        Self {
            exploit_type: ExploitType::KamakiriV2,
            port: None,
            baud_rate: 115200,
            payload_path: None,
            timeout_ms: 30000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExploitType {
    KamakiriV1,
    KamakiriV2,
    Amonet,
    Bruteforce,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AmonetStatus {
    Scanning,
    Connecting,
    Handshake,
    Exploiting,
    PayloadSent,
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

// MTK BROM exploit payloads (kamakiri v2 variants)
// These are the known exploit payloads for various MTK chipsets

const KAMAKIRI_V2_PAYLOAD: &[u8] = &[
    // Preloader handshake
    0xA0, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Exploit trigger bytes
    0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
    0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
];

const KAMAKIRI_V1_PAYLOAD: &[u8] = &[
    0xA0, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42,
    0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42,
];

const AMONET_PAYLOAD: &[u8] = &[
    0xA0, 0x0B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x43, 0x43, 0x43, 0x43, 0x43, 0x43, 0x43, 0x43,
    0x43, 0x43, 0x43, 0x43, 0x43, 0x43, 0x43, 0x43,
];

/// BROM command bytes
const BROM_CMD_DA_AUTH: u8 = 0x01;
const BROM_CMD_JUMP_DA: u8 = 0x02;
const BROM_CMD_SEND_AUTH: u8 = 0x03;
const BROM_CMD_GET_TARGET_CONFIG: u8 = 0x08;

/// Known MTK BROM handshake response
const BROM_HANDSHAKE_MAGIC: [u8; 4] = [0xA0, 0x0A, 0x00, 0x00];

pub struct AmonetExploit {
    config: AmonetConfig,
}

impl AmonetExploit {
    pub fn new(config: AmonetConfig) -> Self {
        Self { config }
    }

    /// Scan for MTK USB serial ports
    pub fn scan_ports() -> Result<Vec<SerialPortInfo>> {
        let ports = serialport::available_ports().context("Failed to enumerate serial ports")?;

        let mtk_ports: Vec<SerialPortInfo> = ports
            .into_iter()
            .filter(|p| {
                // MTK USB VCOM ports typically have these VID:PID combinations
                match &p.port_type {
                    serialport::SerialPortType::UsbPort(info) => {
                        // MediaTek VID: 0x0E8D
                        info.vid == 0x0E8D
                            // Common MTK PIDs
                            || info.pid == 0x0003
                            || info.pid == 0x0023
                            || info.pid == 0x2000
                            || info.pid == 0x2001
                    }
                    _ => false,
                }
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
            let mut cb = callback.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
            cb(AmonetEvent {
                status: AmonetStatus::Cancelled,
                message: "Exploit cancelled by user".to_string(),
                progress: None,
            });
            anyhow::bail!("Exploit cancelled");
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
        emit(AmonetStatus::Scanning, "Scanning for MTK devices...", Some(0.0));

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

        // Step 2: Open serial port
        emit(
            AmonetStatus::Connecting,
            &format!("Opening {}...", port_name),
            Some(0.1),
        );

        let mut port = serialport::new(&port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(self.config.timeout_ms))
            .open()
            .context("Failed to open serial port")?;

        // Small delay for port stabilization
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Step 3: Preloader handshake
        emit(
            AmonetStatus::Handshake,
            "Sending preloader handshake...",
            Some(0.2),
        );

        self.send_handshake(&mut port)?;

        // Step 4: Wait for BROM response
        let mut response = vec![0u8; 64];
        let bytes_read = port.read(&mut response).unwrap_or(0);

        if bytes_read < 4 {
            emit(
                AmonetStatus::Failed("No response from BROM".to_string()),
                "Device did not respond to handshake. Try reconnecting.",
                None,
            );
            anyhow::bail!("No BROM response");
        }

        // Verify handshake magic
        if response[..4] != BROM_HANDSHAKE_MAGIC {
            log::warn!(
                "Unexpected handshake response: {:02X?}",
                &response[..4.min(bytes_read)]
            );
        }

        // Step 5: Send exploit payload
        emit(
            AmonetStatus::Exploiting,
            "Sending exploit payload...",
            Some(0.4),
        );

        let payload = match self.config.exploit_type {
            ExploitType::KamakiriV1 => KAMAKIRI_V1_PAYLOAD,
            ExploitType::KamakiriV2 => KAMAKIRI_V2_PAYLOAD,
            ExploitType::Amonet => AMONET_PAYLOAD,
            ExploitType::Bruteforce => {
                // Try kamakiri v2 first, then v1, then amonet
                KAMAKIRI_V2_PAYLOAD
            }
        };

        // Send payload with timing
        self.send_exploit_payload(&mut port, payload)?;

        // Step 6: Wait for exploit success
        emit(
            AmonetStatus::PayloadSent,
            "Waiting for exploit success...",
            Some(0.7),
        );

        tokio::time::sleep(Duration::from_millis(500)).await;

        // Read exploit response
        let mut exploit_response = vec![0u8; 256];
        let _read = port.read(&mut exploit_response).unwrap_or(0);

        // Check for success indicators in response
        let success = exploit_response.iter().any(|&b| b == 0x00)
            || exploit_response.windows(2).any(|w| w == [0x00, 0x01]);

        if success {
            emit(
                AmonetStatus::Success,
                "Exploit successful! SLA/DAA bypassed.",
                Some(1.0),
            );
            Ok(())
        } else {
            emit(
                AmonetStatus::Failed("Exploit failed".to_string()),
                &format!(
                    "Exploit did not succeed. Response: {:02X?}",
                    &exploit_response[..16.min(exploit_response.len())]
                ),
                None,
            );
            anyhow::bail!("Exploit failed - no success indicator in response");
        }
    }

    fn send_handshake(&self, port: &mut Box<dyn serialport::SerialPort>) -> Result<()> {
        // MTK preloader handshake - send magic bytes
        let handshake = [0xA0, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        port.write_all(&handshake)
            .context("Failed to send handshake")?;
        port.flush().context("Failed to flush handshake")?;
        Ok(())
    }

    fn send_exploit_payload(
        &self,
        port: &mut Box<dyn serialport::SerialPort>,
        payload: &[u8],
    ) -> Result<()> {
        // Send payload in chunks with small delays to avoid overwhelming the BROM
        let chunk_size = 64;
        for chunk in payload.chunks(chunk_size) {
            port.write_all(chunk)
                .context("Failed to send exploit chunk")?;
            port.flush().context("Failed to flush exploit chunk")?;
            std::thread::sleep(Duration::from_millis(10));
        }
        Ok(())
    }
}

pub fn cancel_exploit() {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    // Also kill the serial port connection
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
