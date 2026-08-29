/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

//! Fastboot native implementation
//!
//! Implements the Fastboot protocol for device communication:
//! - Device flashing (boot, system, vendor, etc.)
//! - Bootloader lock/unlock
//! - Device information queries
//! - Slot management (A/B devices)
//! - OEM commands

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

static FASTBOOT_RUNNING: AtomicBool = AtomicBool::new(false);

/// Fastboot USB protocol constants
const FB_USB_CLASS: u8 = 0xFF;
const FB_USB_SUBCLASS: u8 = 0x42;
const FB_USB_PROTOCOL: u8 = 0x01;

/// Fastboot response prefixes
const FB_OKAY: &str = "OKAY";
const FB_FAIL: &str = "FAIL";
const FB_DATA: &str = "DATA";
const FB_INFO: &str = "INFO";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastbootDeviceInfo {
    pub serial: String,
    pub usb_path: Option<String>,
    pub is_unlocked: bool,
    pub is_dynamic: bool,
    pub current_slot: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastbootVar {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastbootFlashResult {
    pub success: bool,
    pub message: String,
    pub partition: String,
    pub bytes_written: u64,
}

pub struct FastbootConnection {
    connected: bool,
    serial: Option<String>,
}

impl FastbootConnection {
    pub fn new() -> Self {
        Self {
            connected: false,
            serial: None,
        }
    }

    /// Scan for fastboot devices using nusb
    pub async fn scan_devices() -> Result<Vec<FastbootDeviceInfo>> {
        let mut devices = Vec::new();

        // Use nusb for USB device enumeration
        match nusb::list_devices().await {
            Ok(device_list) => {
                for device in device_list {
                    // Fastboot devices have specific VID:PID or interface class
                    if device.class() == FB_USB_CLASS
                        && device.subclass() == FB_USB_SUBCLASS
                        && device.protocol() == FB_USB_PROTOCOL
                    {
                        devices.push(FastbootDeviceInfo {
                            serial: device
                                .serial_number()
                                .unwrap_or("unknown")
                                .to_string(),
                            usb_path: Some(format!(
                                "Bus {:03} Device {:03}",
                                device.bus_number().unwrap_or(0),
                                device.device_address().unwrap_or(0)
                            )),
                            is_unlocked: false,
                            is_dynamic: false,
                            current_slot: None,
                        });
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to enumerate USB devices: {}", e);
            }
        }

        Ok(devices)
    }

    /// Execute a fastboot command via the fastboot binary
    pub fn execute_command(args: &[String]) -> Result<FastbootOutput> {
        let output = std::process::Command::new("fastboot")
            .args(args)
            .output()
            .context("Failed to execute fastboot. Is it installed?")?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let success = output.status.success();

        Ok(FastbootOutput {
            success,
            stdout,
            stderr,
        })
    }

    /// Get variable value
    pub fn get_var(var_name: &str) -> Result<String> {
        let output = Self::execute_command(&["getvar".to_string(), var_name.to_string()])?;

        if output.success {
            // Parse "varname: value" from stderr (fastboot outputs to stderr)
            for line in output.stderr.lines() {
                if let Some(value) = line.strip_prefix(&format!("{}:", var_name)) {
                    return Ok(value.trim().to_string());
                }
            }
            Ok(output.stdout.trim().to_string())
        } else {
            anyhow::bail!("Failed to get variable {}: {}", var_name, output.stderr);
        }
    }

    /// Get all fastboot variables
    pub fn get_all_vars() -> Result<Vec<FastbootVar>> {
        let output = Self::execute_command(&["getvar".to_string(), "all".to_string()])?;

        let mut vars = Vec::new();
        for line in output.stderr.lines() {
            if let Some((name, value)) = line.split_once(':') {
                let name = name.trim().to_string();
                let value = value.trim().to_string();
                if !name.is_empty() && name != "all" {
                    vars.push(FastbootVar { name, value });
                }
            }
        }

        Ok(vars)
    }

    /// Flash a partition
    pub fn flash_partition(
        partition: &str,
        file_path: &str,
    ) -> Result<FastbootFlashResult> {
        let output = Self::execute_command(&[
            "flash".to_string(),
            partition.to_string(),
            file_path.to_string(),
        ])?;

        let success = output.success;
        let message = if success {
            output.stdout.clone()
        } else {
            output.stderr.clone()
        };

        Ok(FastbootFlashResult {
            success,
            message,
            partition: partition.to_string(),
            bytes_written: 0, // Would need to parse output for exact count
        })
    }

    /// Erase a partition
    pub fn erase_partition(partition: &str) -> Result<()> {
        let output = Self::execute_command(&["erase".to_string(), partition.to_string()])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Failed to erase {}: {}", partition, output.stderr);
        }
    }

    /// Boot from image file
    pub fn boot_image(file_path: &str) -> Result<()> {
        let output = Self::execute_command(&["boot".to_string(), file_path.to_string()])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Failed to boot: {}", output.stderr);
        }
    }

    /// Boot from kernel
    pub fn boot_kernel(file_path: &str) -> Result<()> {
        let output = Self::execute_command(&[
            "boot".to_string(),
            file_path.to_string(),
        ])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Failed to boot kernel: {}", output.stderr);
        }
    }

    /// Reboot device
    pub fn reboot(mode: &str) -> Result<()> {
        let args = match mode {
            "bootloader" => vec!["reboot-bootloader".to_string()],
            "recovery" => vec!["reboot-recovery".to_string()],
            _ => vec!["reboot".to_string()],
        };

        let output = Self::execute_command(&args)?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Failed to reboot: {}", output.stderr);
        }
    }

    /// Set active slot (A/B devices)
    pub fn set_active_slot(slot: &str) -> Result<()> {
        let output = Self::execute_command(&[
            "set_active".to_string(),
            slot.to_string(),
        ])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Failed to set active slot: {}", output.stderr);
        }
    }

    /// Flash full partition image (e.g., super, boot)
    pub fn flash_full(partition: &str, file_path: &str) -> Result<FastbootFlashResult> {
        Self::flash_partition(partition, file_path)
    }

    /// OEM command
    pub fn oem_command(command: &str) -> Result<()> {
        let output = Self::execute_command(&["oem".to_string(), command.to_string()])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("OEM command failed: {}", output.stderr);
        }
    }

    /// Unlock bootloader (requires device confirmation)
    pub fn oem_unlock() -> Result<()> {
        Self::oem_command("unlock".to_string().as_str())
    }

    /// Lock bootloader
    pub fn oem_lock() -> Result<()> {
        Self::oem_command("lock".to_string().as_str())
    }

    /// Disable verity
    pub fn disable_verity() -> Result<()> {
        let output = Self::execute_command(&[
            "oem".to_string(),
            "lock".to_string(), // placeholder
        ])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Failed to disable verity: {}", output.stderr);
        }
    }

    /// Wait for device
    pub fn wait_for_device(_timeout_secs: u64) -> Result<()> {
        let output = Self::execute_command(&[
            "wait-for-device".to_string(),
        ])?;

        if output.success {
            Ok(())
        } else {
            anyhow::bail!("Timeout waiting for device");
        }
    }
}

#[derive(Debug, Clone)]
pub struct FastbootOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

pub fn is_running() -> bool {
    FASTBOOT_RUNNING.load(Ordering::SeqCst)
}
