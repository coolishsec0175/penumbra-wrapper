/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::adb::{AdbConnection, AdbDeviceInfo, AdbShellResult};
use std::collections::HashMap;

#[tauri::command]
pub async fn adb_list_devices() -> Result<Vec<AdbDeviceInfo>, AppError> {
    AdbConnection::list_devices().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn adb_shell_command(serial: String, command: String) -> Result<AdbShellResult, AppError> {
    AdbConnection::shell_command(&serial, &command).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn adb_get_device_props(serial: String) -> Result<HashMap<String, String>, AppError> {
    AdbConnection::get_device_props(&serial).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn adb_reboot(serial: String, mode: String) -> Result<(), AppError> {
    AdbConnection::reboot(&serial, &mode).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn adb_push(serial: String, local_path: String, remote_path: String) -> Result<String, AppError> {
    // Use adb binary for push
    let output = std::process::Command::new("adb")
        .args(["-s", &serial, "push", &local_path, &remote_path])
        .output()
        .map_err(|e| AppError::command(format!("Failed to execute adb: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(AppError::command(String::from_utf8_lossy(&output.stderr).to_string()))
    }
}

#[tauri::command]
pub async fn adb_pull(serial: String, remote_path: String, local_path: String) -> Result<String, AppError> {
    let output = std::process::Command::new("adb")
        .args(["-s", &serial, "pull", &remote_path, &local_path])
        .output()
        .map_err(|e| AppError::command(format!("Failed to execute adb: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(AppError::command(String::from_utf8_lossy(&output.stderr).to_string()))
    }
}

#[tauri::command]
pub async fn adb_logcat(serial: String, lines: Option<u32>) -> Result<String, AppError> {
    let line_count = lines.unwrap_or(100);
    let output = std::process::Command::new("adb")
        .args(["-s", &serial, "logcat", "-d", "-t", &line_count.to_string()])
        .output()
        .map_err(|e| AppError::command(format!("Failed to execute adb: {}", e)))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn adb_sideload(serial: String, file_path: String) -> Result<String, AppError> {
    let output = std::process::Command::new("adb")
        .args(["-s", &serial, "sideload", &file_path])
        .output()
        .map_err(|e| AppError::command(format!("Failed to execute adb: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(AppError::command(String::from_utf8_lossy(&output.stderr).to_string()))
    }
}
