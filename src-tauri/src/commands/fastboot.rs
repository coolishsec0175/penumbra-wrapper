/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::commands::{emit_operation_complete, emit_operation_output};
use crate::error::AppError;
use crate::services::device_discovery;
use serde::Serialize;
use std::io::Write;
#[cfg(target_os = "linux")]
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

const VENDOR_ID: u16 = 0x0E8D;
const BOOT_MODE_CMD: &[u8] = b"FASTBOOT";
const KEYWORDS: [&str; 3] = ["MediaTek", "PreLoader", "MTK"];
const BAUDS: [u32; 3] = [115_200, 921_600, 57_600];
const SCAN_WINDOW_SECS: f32 = 120.0;
const PORT_ATTEMPT_SECS: f32 = 2.5;
const POLL_INTERVAL_SECS: f32 = 0.2;
const READ_TIMEOUT_SECS: f32 = 0.0;
const FLOOD_INTERVAL_SECS: f32 = 0.03;
const FASTBOOT_MODE_POLL_SECS: f32 = 0.5;
const FASTBOOT_IFACE_CLASS: u8 = 0xff;
const FASTBOOT_IFACE_SUBCLASS: u8 = 0x42;
const FASTBOOT_IFACE_PROTOCOL: u8 = 0x03;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FastbootStatus {
    Start,
    Success,
    NoDevice,
    OpenError,
    NoAck,
    Cancelled,
    Error,
}

/// Shared cancellation flag for the (long-running) force-fastboot attempt.
#[derive(Default)]
pub struct FastbootCancel(Arc<AtomicBool>);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FastbootStatusEvent {
    status: FastbootStatus,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FastbootResult {
    status: FastbootStatus,
    message: String,
}

#[tauri::command]
pub async fn force_fastboot(
    app: AppHandle,
    state: State<'_, FastbootCancel>,
) -> Result<FastbootResult, AppError> {
    state.0.store(false, Ordering::SeqCst);
    let cancel_flag = state.0.clone();
    let app_handle = app.clone();
    let result = tokio::task::spawn_blocking(move || force_fastboot_blocking(app_handle, cancel_flag))
        .await
        .map_err(|err| AppError::command(err.to_string()))?;

    Ok(result)
}

#[tauri::command]
pub async fn cancel_fastboot(state: State<'_, FastbootCancel>) -> Result<(), AppError> {
    state.0.store(true, Ordering::SeqCst);
    Ok(())
}

fn force_fastboot_blocking(app: AppHandle, cancel_flag: Arc<AtomicBool>) -> FastbootResult {
    let operation_id = Uuid::new_v4().to_string();
    emit_status(
        &app,
        FastbootStatus::Start,
        "Attempting to switch device to Fastboot...",
    );
    emit_operation_output(
        &app,
        &operation_id,
        "Starting MTK fastboot attempt...",
        false,
    );

    if let Ok(true) = device_discovery::ensure_udev_rules(Some(&app)) {
        emit_operation_output(
            &app,
            &operation_id,
            "MediaTek udev rules installed for device access.",
            false,
        );
    }

    if in_fastboot_mode() {
        let message = "Device already in Fastboot mode.".to_string();
        emit_status(&app, FastbootStatus::Success, &message);
        emit_operation_output(&app, &operation_id, &message, false);
        emit_operation_complete(&app, &operation_id, true, None);
        return FastbootResult {
            status: FastbootStatus::Success,
            message,
        };
    }

    let expected_ack = build_expected_ack();
    let scan_deadline = Instant::now() + Duration::from_secs_f32(SCAN_WINDOW_SECS);
    let mut saw_device = false;
    let mut saw_no_ack = false;
    let mut saw_open_error = false;
    let mut last_attempt: std::collections::HashMap<String, Instant> =
        std::collections::HashMap::new();
    let mut last_mode_check = Instant::now();

    while Instant::now() < scan_deadline {
        if cancel_flag.load(Ordering::SeqCst) {
            return cancelled_result(&app, &operation_id);
        }

        if last_mode_check.elapsed() >= Duration::from_secs_f32(FASTBOOT_MODE_POLL_SECS) {
            if in_fastboot_mode() {
                let message = "Device switched to Fastboot during handshake.".to_string();
                emit_status(&app, FastbootStatus::Success, &message);
                emit_operation_output(&app, &operation_id, &message, false);
                emit_operation_complete(&app, &operation_id, true, None);
                return FastbootResult {
                    status: FastbootStatus::Success,
                    message,
                };
            }
            last_mode_check = Instant::now();
        }

        let ports = match serialport::available_ports() {
            Ok(ports) => ports,
            Err(err) => {
                let message = format!("Failed to enumerate ports: {}", err);
                emit_status(&app, FastbootStatus::Error, &message);
                emit_operation_output(&app, &operation_id, &message, true);
                emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
                return FastbootResult {
                    status: FastbootStatus::Error,
                    message,
                };
            }
        };

        let ranked_ports = rank_ports(ports, VENDOR_ID, &KEYWORDS);

        if ranked_ports.is_empty() {
            std::thread::sleep(Duration::from_secs_f32(POLL_INTERVAL_SECS));
            continue;
        }

        for port in ranked_ports {
            let now = Instant::now();
            if let Some(last) = last_attempt.get(&port.port_name) {
                if now.duration_since(*last) < Duration::from_millis(500) {
                    continue;
                }
            }
            last_attempt.insert(port.port_name.clone(), now);

            saw_device = true;
            let port_message = format!(
                "Detected candidate MTK port: {} ({:?})",
                port.port_name, port.port_type
            );
            log::info!("{}", port_message);
            emit_operation_output(&app, &operation_id, &port_message, false);

            for baud in BAUDS {
                let attempt = attempt_fastboot(
                    &port.port_name,
                    baud,
                    Duration::from_secs_f32(READ_TIMEOUT_SECS),
                    Duration::from_secs_f32(PORT_ATTEMPT_SECS),
                    Duration::from_secs_f32(FLOOD_INTERVAL_SECS),
                    &expected_ack,
                    &cancel_flag,
                );

                match attempt {
                    AttemptResult::Success => {
                        let message = "Handshake successful. Device should be in Fastboot.";
                        emit_status(&app, FastbootStatus::Success, message);
                        emit_operation_output(&app, &operation_id, message, false);
                        emit_operation_complete(&app, &operation_id, true, None);
                        return FastbootResult {
                            status: FastbootStatus::Success,
                            message: message.to_string(),
                        };
                    }
                    AttemptResult::OpenError(err) => {
                        saw_open_error = true;
                        let error_message = format!(
                            "Failed to open port {} at {} baud: {}",
                            port.port_name, baud, err
                        );
                        log::warn!("{}", error_message);
                        emit_operation_output(&app, &operation_id, &error_message, true);
                    }
                    AttemptResult::NoAck => {
                        saw_no_ack = true;
                    }
                    AttemptResult::Disconnected => {
                        let dropped_message = format!(
                            "Port {} dropped mid-handshake; device may be switching to Fastboot.",
                            port.port_name
                        );
                        log::info!("{}", dropped_message);
                        emit_operation_output(&app, &operation_id, &dropped_message, false);
                    }
                    AttemptResult::Cancelled => {
                        return cancelled_result(&app, &operation_id);
                    }
                }
            }
        }

        std::thread::sleep(Duration::from_secs_f32(POLL_INTERVAL_SECS));
    }

    if in_fastboot_mode() {
        let message = "Device switched to Fastboot during handshake.".to_string();
        emit_status(&app, FastbootStatus::Success, &message);
        emit_operation_output(&app, &operation_id, &message, false);
        emit_operation_complete(&app, &operation_id, true, None);
        return FastbootResult {
            status: FastbootStatus::Success,
            message,
        };
    }

    if !saw_device {
        let message = "No MTK preloader device detected.".to_string();
        emit_status(&app, FastbootStatus::NoDevice, &message);
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return FastbootResult {
            status: FastbootStatus::NoDevice,
            message,
        };
    }

    if saw_open_error && !saw_no_ack {
        let message = if cfg!(target_os = "linux") {
            "Ports detected but could not be opened. Check udev permissions for VID 0e8d.".to_string()
        } else {
            "Ports detected but could not be opened. Check driver permissions.".to_string()
        };
        emit_status(&app, FastbootStatus::OpenError, &message);
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return FastbootResult {
            status: FastbootStatus::OpenError,
            message,
        };
    }

    let message = "Device detected but no ACK received from preloader.".to_string();
    emit_status(&app, FastbootStatus::NoAck, &message);
    emit_operation_output(&app, &operation_id, &message, true);
    emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
    FastbootResult {
        status: FastbootStatus::NoAck,
        message,
    }
}

fn emit_status(app: &AppHandle, status: FastbootStatus, message: &str) {
    let payload = FastbootStatusEvent {
        status,
        message: message.to_string(),
    };
    let _ = app.emit("fastboot:status", payload);
}

fn cancelled_result(app: &AppHandle, operation_id: &str) -> FastbootResult {
    let message = "Fastboot attempt cancelled.".to_string();
    emit_status(app, FastbootStatus::Cancelled, &message);
    emit_operation_output(app, operation_id, &message, true);
    emit_operation_complete(app, operation_id, false, Some(message.clone()));
    FastbootResult {
        status: FastbootStatus::Cancelled,
        message,
    }
}

/// Check whether a device is already exposed in Fastboot mode over USB by
/// matching the fastboot interface class/subclass/protocol (ff/42/03).
fn in_fastboot_mode() -> bool {
    if nusb_fastboot_mode() {
        return true;
    }
    #[cfg(target_os = "linux")]
    {
        if linux_sysfs_fastboot_mode() {
            return true;
        }
    }
    false
}

fn nusb_fastboot_mode() -> bool {
    let devices = match pollster::block_on(nusb::list_devices()) {
        Ok(devices) => devices,
        Err(err) => {
            log::warn!("Failed to enumerate USB devices: {}", err);
            return false;
        }
    };

    for dev in devices {
        let matched = dev.interfaces().any(|intf| {
            intf.class() == FASTBOOT_IFACE_CLASS
                && intf.subclass() == FASTBOOT_IFACE_SUBCLASS
                && intf.protocol() == FASTBOOT_IFACE_PROTOCOL
        });
        if matched {
            log::info!("Fastboot interface detected (VID {:04x}).", dev.vendor_id());
            return true;
        }
    }

    false
}

#[cfg(target_os = "linux")]
fn linux_sysfs_fastboot_mode() -> bool {
    let root = Path::new("/sys/bus/usb/devices");
    let Ok(entries) = std::fs::read_dir(root) else {
        return false;
    };

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.contains(':') {
            continue;
        }

        let base = entry.path();
        let class = read_trimmed(base.join("bInterfaceClass"));
        let subclass = read_trimmed(base.join("bInterfaceSubClass"));
        let protocol = read_trimmed(base.join("bInterfaceProtocol"));

        if class == "ff" && subclass == "42" && protocol == "03" {
            log::info!("Fastboot interface detected via sysfs ({})", name);
            return true;
        }
    }

    false
}

#[cfg(target_os = "linux")]
fn read_trimmed(path: std::path::PathBuf) -> String {
    std::fs::read_to_string(path)
        .map(|s| s.trim().to_ascii_lowercase())
        .unwrap_or_default()
}

#[derive(Debug)]
enum AttemptResult {
    Success,
    OpenError(String),
    NoAck,
    Disconnected,
    Cancelled,
}

fn attempt_fastboot(
    port_name: &str,
    baud: u32,
    timeout: Duration,
    attempt_window: Duration,
    flood_interval: Duration,
    expected_ack: &[u8],
    cancel_flag: &AtomicBool,
) -> AttemptResult {
    let mut port: Box<dyn serialport::SerialPort> = match serialport::new(port_name, baud)
        .timeout(timeout)
        .open()
    {
        Ok(port) => port,
        Err(err) => return AttemptResult::OpenError(err.to_string()),
    };

    let start = Instant::now();
    let flood_duration = attempt_window.mul_f32(0.6).min(Duration::from_secs_f32(1.5));
    let probe_duration = attempt_window
        .checked_sub(flood_duration)
        .unwrap_or(Duration::from_secs_f32(0.2))
        .max(Duration::from_secs_f32(0.2));
    let mut last_mode_check = Instant::now();

    while Instant::now().duration_since(start) < flood_duration {
        if cancel_flag.load(Ordering::SeqCst) {
            return AttemptResult::Cancelled;
        }
        if port.write_all(BOOT_MODE_CMD).is_err() {
            // Write failure usually means the device switched modes and dropped
            // the serial port. Confirm via USB before declaring a problem.
            if in_fastboot_mode() {
                return AttemptResult::Success;
            }
            return AttemptResult::Disconnected;
        }

        if let Some(resp) = read_response(port.as_mut(), 32) {
            if resp.windows(expected_ack.len()).any(|w| w == expected_ack)
                || resp.windows(5).any(|w| w == b"READY")
            {
                return AttemptResult::Success;
            }
        }

        if last_mode_check.elapsed() >= Duration::from_secs_f32(FASTBOOT_MODE_POLL_SECS) {
            if in_fastboot_mode() {
                return AttemptResult::Success;
            }
            last_mode_check = Instant::now();
        }

        std::thread::sleep(flood_interval);
    }

    let mut last_write = Instant::now();
    let probe_start = Instant::now();
    while Instant::now().duration_since(probe_start) < probe_duration {
        if cancel_flag.load(Ordering::SeqCst) {
            return AttemptResult::Cancelled;
        }

        if let Some(resp) = read_response(port.as_mut(), 64) {
            if resp.windows(expected_ack.len()).any(|w| w == expected_ack)
                || resp.windows(5).any(|w| w == b"READY")
            {
                return AttemptResult::Success;
            }
        }

        if last_write.elapsed() >= Duration::from_millis(200) {
            if port.write_all(BOOT_MODE_CMD).is_err() {
                if in_fastboot_mode() {
                    return AttemptResult::Success;
                }
                return AttemptResult::Disconnected;
            }
            last_write = Instant::now();
        }

        if last_mode_check.elapsed() >= Duration::from_secs_f32(FASTBOOT_MODE_POLL_SECS) {
            if in_fastboot_mode() {
                return AttemptResult::Success;
            }
            last_mode_check = Instant::now();
        }

        std::thread::sleep(Duration::from_millis(50));
    }

    AttemptResult::NoAck
}

fn read_response(port: &mut dyn serialport::SerialPort, size: usize) -> Option<Vec<u8>> {
    let mut buf = vec![0u8; size];
    match port.read(buf.as_mut_slice()) {
        Ok(count) if count > 0 => {
            buf.truncate(count);
            Some(buf)
        }
        Ok(_) => None,
        Err(err) => match err.kind() {
            std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock => None,
            _ => None,
        },
    }
}

fn rank_ports(
    ports: Vec<serialport::SerialPortInfo>,
    vid: u16,
    keywords: &[&str],
) -> Vec<serialport::SerialPortInfo> {
    let mut candidates: Vec<(i32, serialport::SerialPortInfo)> = Vec::new();

    for port in ports {
        let mut score = 0;
        let mut desc = String::new();

        if let serialport::SerialPortType::UsbPort(info) = &port.port_type {
            if info.vid == vid {
                score += 100;
            }

            if let Some(product) = &info.product {
                desc.push_str(product);
                desc.push(' ');
            }
            if let Some(manufacturer) = &info.manufacturer {
                desc.push_str(manufacturer);
                desc.push(' ');
            }
        }

        let lower_desc = desc.to_lowercase();
        for keyword in keywords {
            if lower_desc.contains(&keyword.to_lowercase()) {
                score += 10;
            }
        }

        if score > 0 {
            candidates.push((score, port));
        }
    }

    candidates.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.port_name.cmp(&b.1.port_name)));
    candidates.into_iter().map(|(_, port)| port).collect()
}

fn build_expected_ack() -> Vec<u8> {
    let tail: Vec<u8> = BOOT_MODE_CMD
        .iter()
        .rev()
        .take(3)
        .cloned()
        .collect();
    let mut ack = b"READY".to_vec();
    ack.extend(tail);
    ack
}

#[cfg(test)]
mod tests {
    use super::*;

    fn usb_port(
        name: &str,
        vid: u16,
        product: &str,
        manufacturer: &str,
    ) -> serialport::SerialPortInfo {
        serialport::SerialPortInfo {
            port_name: name.to_string(),
            port_type: serialport::SerialPortType::UsbPort(serialport::UsbPortInfo {
                vid,
                pid: 0x0001,
                serial_number: None,
                manufacturer: Some(manufacturer.to_string()),
                product: Some(product.to_string()),
            }),
        }
    }

    #[test]
    fn build_expected_ack_should_be_ready_plus_reversed_tail() {
        assert_eq!(build_expected_ack(), b"READYTOO");
    }

    #[test]
    fn rank_ports_should_score_vid_and_keywords() {
        let ports = vec![
            usb_port("COM3", 0x0E8D, "MTK USB Port", "MediaTek"),
            usb_port("COM5", 0x1234, "Serial", "Acme"),
            usb_port("COM7", 0x0E8D, "Serial", "Acme"),
        ];
        let ranked = rank_ports(ports, VENDOR_ID, &KEYWORDS);
        assert_eq!(ranked.len(), 2);
        assert_eq!(ranked[0].port_name, "COM3");
        assert_eq!(ranked[1].port_name, "COM7");
    }

    #[test]
    fn rank_ports_should_be_empty_when_nothing_matches() {
        let ports = vec![usb_port("COM9", 0x1234, "Serial", "Acme")];
        assert!(rank_ports(ports, VENDOR_ID, &KEYWORDS).is_empty());
    }
}
