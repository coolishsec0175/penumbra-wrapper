/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

//! ADB (Android Debug Bridge) native implementation
//!
//! Implements the ADB protocol for device communication:
//! - Device discovery and connection
//! - Shell command execution
//! - File push/pull
//! - Logcat streaming
//! - Device properties and info

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

static ADB_RUNNING: AtomicBool = AtomicBool::new(false);

/// ADB protocol command codes
const A_CNXN: u32 = 0x4e584e43; // CONNECT
const A_OPEN: u32 = 0x4e45504f; // OPEN
const A_OKAY: u32 = 0x59414b4f; // OKAY
const A_CLSE: u32 = 0x45534c43; // CLOSE
const A_WRTE: u32 = 0x45545257; // WRITE
const A_AUTH: u32 = 0x48545541; // AUTH

/// ADB message header (24 bytes)
#[derive(Debug, Clone)]
struct AdbMessage {
    command: u32,
    arg0: u32,
    arg1: u32,
    data_length: u32,
    data_crc: u32,
    magic: u32,
}

impl AdbMessage {
    fn new(command: u32, arg0: u32, arg1: u32, data_length: u32) -> Self {
        let magic = command ^ 0xFFFFFFFF;
        Self {
            command,
            arg0,
            arg1,
            data_length,
            data_crc: 0, // CRC computed on data
            magic,
        }
    }

    fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(24);
        buf.extend_from_slice(&self.command.to_le_bytes());
        buf.extend_from_slice(&self.arg0.to_le_bytes());
        buf.extend_from_slice(&self.arg1.to_le_bytes());
        buf.extend_from_slice(&self.data_length.to_le_bytes());
        buf.extend_from_slice(&self.data_crc.to_le_bytes());
        buf.extend_from_slice(&self.magic.to_le_bytes());
        buf
    }

    fn from_bytes(data: &[u8]) -> Result<Self> {
        if data.len() < 24 {
            anyhow::bail!("ADB message too short");
        }
        Ok(Self {
            command: u32::from_le_bytes([data[0], data[1], data[2], data[3]]),
            arg0: u32::from_le_bytes([data[4], data[5], data[6], data[7]]),
            arg1: u32::from_le_bytes([data[8], data[9], data[10], data[11]]),
            data_length: u32::from_le_bytes([data[12], data[13], data[14], data[15]]),
            data_crc: u32::from_le_bytes([data[16], data[17], data[18], data[19]]),
            magic: u32::from_le_bytes([data[20], data[21], data[22], data[23]]),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdbDeviceInfo {
    pub serial: String,
    pub state: String,
    pub product: Option<String>,
    pub model: Option<String>,
    pub device: Option<String>,
    pub transport_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdbShellResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdbFileTransfer {
    pub local_path: String,
    pub remote_path: String,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub complete: bool,
}

pub struct AdbConnection {
    host: String,
    port: u16,
    connected: bool,
    device_serial: Option<String>,
}

impl AdbConnection {
    pub fn new(host: &str, port: u16) -> Self {
        Self {
            host: host.to_string(),
            port,
            connected: false,
            device_serial: None,
        }
    }

    /// Connect to ADB server
    pub fn connect(&mut self) -> Result<()> {
        use std::net::TcpStream;

        let addr = format!("{}:{}", self.host, self.port);
        let mut stream =
            TcpStream::connect(&addr).context("Failed to connect to ADB server. Is adb running?")?;
        stream.set_read_timeout(Some(Duration::from_secs(10)))?;

        // Send CONNECT message
        let msg = AdbMessage::new(A_CNXN, 0x01000000, 4096, 0);
        stream.write_all(&msg.to_bytes())?;

        // Read response
        let mut header = [0u8; 24];
        stream.read_exact(&mut header)?;
        let response = AdbMessage::from_bytes(&header)?;

        if response.command == A_OKAY {
            self.connected = true;
            // Read system string if present
            if response.data_length > 0 {
                let mut system_info = vec![0u8; response.data_length as usize];
                stream.read_exact(&mut system_info)?;
            }
            Ok(())
        } else {
            anyhow::bail!("ADB server rejected connection");
        }
    }

    /// List connected devices
    pub fn list_devices() -> Result<Vec<AdbDeviceInfo>> {
        use std::net::TcpStream;

        let addr = "127.0.0.1:5037";
        let mut stream =
            TcpStream::connect(addr).context("Failed to connect to ADB server on 127.0.0.1:5037")?;
        stream.set_read_timeout(Some(Duration::from_secs(5)))?;

        // Send list-devices command
        let cmd = format!("{:04X}{}", "host:devices".len(), "host:devices");
        stream.write_all(cmd.as_bytes())?;

        // Read length
        let mut len_buf = [0u8; 4];
        stream.read_exact(&mut len_buf)?;
        let len = u32::from_be_bytes(len_buf) as usize;

        // Read response type
        let mut type_buf = [0u8; 4];
        stream.read_exact(&mut type_buf)?;
        let resp_type = String::from_utf8_lossy(&type_buf);

        if resp_type.starts_with("OKAY") {
            let mut data = vec![0u8; len];
            stream.read_exact(&mut data)?;
            let output = String::from_utf8_lossy(&data);

            let devices: Vec<AdbDeviceInfo> = output
                .lines()
                .filter(|line| !line.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.split('\t').collect();
                    AdbDeviceInfo {
                        serial: parts.first().unwrap_or(&"").to_string(),
                        state: parts.get(1).unwrap_or(&"unknown").to_string(),
                        product: None,
                        model: None,
                        device: None,
                        transport_id: None,
                    }
                })
                .collect();

            Ok(devices)
        } else {
            anyhow::bail!("ADB server returned error");
        }
    }

    /// Execute a shell command
    pub fn shell_command(serial: &str, command: &str) -> Result<AdbShellResult> {
        use std::net::TcpStream;

        let addr = "127.0.0.1:5037";
        let mut stream = TcpStream::connect(addr).context("Failed to connect to ADB server")?;
        stream.set_read_timeout(Some(Duration::from_secs(30)))?;

        // Connect to device
        let device_cmd = format!("host:transport:{}", serial);
        let cmd = format!("{:04X}{}", device_cmd.len(), device_cmd);
        stream.write_all(cmd.as_bytes())?;

        let mut len_buf = [0u8; 4];
        stream.read_exact(&mut len_buf)?;

        let mut type_buf = [0u8; 4];
        stream.read_exact(&mut type_buf)?;

        // Send shell command
        let shell_cmd = format!("shell:{}", command);
        let cmd = format!("{:04X}{}", shell_cmd.len(), shell_cmd);
        stream.write_all(cmd.as_bytes())?;

        // Read response
        let mut len_buf2 = [0u8; 4];
        stream.read_exact(&mut len_buf2)?;
        let data_len = u32::from_be_bytes(len_buf2) as usize;

        let mut type_buf2 = [0u8; 4];
        stream.read_exact(&mut type_buf2)?;

        if type_buf2.starts_with(b"OKAY") {
            let mut output = vec![0u8; data_len];
            stream.read_exact(&mut output)?;

            // Read exit code (WRTE message)
            let mut exit_header = [0u8; 24];
            if stream.read_exact(&mut exit_header).is_ok() {
                let exit_msg = AdbMessage::from_bytes(&exit_header)?;
                if exit_msg.command == A_WRTE && exit_msg.data_length > 0 {
                    let mut exit_data = vec![0u8; exit_msg.data_length as usize];
                    stream.read_exact(&mut exit_data).ok();

                    // Send OKAY for WRTE
                    let okay_msg = AdbMessage::new(A_OKAY, exit_msg.arg0, exit_msg.arg1, 0);
                    stream.write_all(&okay_msg.to_bytes()).ok();
                }
            }

            Ok(AdbShellResult {
                exit_code: 0,
                stdout: String::from_utf8_lossy(&output).to_string(),
                stderr: String::new(),
            })
        } else {
            let mut error = vec![0u8; data_len];
            stream.read_exact(&mut error)?;
            Ok(AdbShellResult {
                exit_code: 1,
                stdout: String::new(),
                stderr: String::from_utf8_lossy(&error).to_string(),
            })
        }
    }

    /// Get device properties
    pub fn get_device_props(serial: &str) -> Result<HashMap<String, String>> {
        let mut props = HashMap::new();

        let prop_keys = [
            "ro.product.model",
            "ro.product.brand",
            "ro.product.device",
            "ro.build.version.release",
            "ro.build.display.id",
            "ro.serialno",
            "ro.hardware.chipname",
            "ro.boot.hardware",
            "ro.build.version.sdk",
            "ro.product.cpu.abi",
        ];

        for key in &prop_keys {
            match Self::shell_command(serial, &format!("getprop {}", key)) {
                Ok(result) => {
                    let value = result.stdout.trim().to_string();
                    if !value.is_empty() {
                        props.insert(key.to_string(), value);
                    }
                }
                Err(_) => continue,
            }
        }

        Ok(props)
    }

    /// Reboot device
    pub fn reboot(serial: &str, mode: &str) -> Result<()> {
        let cmd = match mode {
            "bootloader" => "reboot bootloader",
            "recovery" => "reboot recovery",
            "sideload" => "reboot sideload",
            _ => "reboot",
        };

        Self::shell_command(serial, cmd)?;
        Ok(())
    }
}

pub fn is_running() -> bool {
    ADB_RUNNING.load(Ordering::SeqCst)
}
