/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::fastboot_native::{FastbootConnection, FastbootDeviceInfo, FastbootFlashResult, FastbootVar};

#[tauri::command]
pub async fn fastboot_scan_devices() -> Result<Vec<FastbootDeviceInfo>, AppError> {
    FastbootConnection::scan_devices().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_get_var(var_name: String) -> Result<String, AppError> {
    FastbootConnection::get_var(&var_name).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_get_all_vars() -> Result<Vec<FastbootVar>, AppError> {
    FastbootConnection::get_all_vars().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_flash(partition: String, file_path: String) -> Result<FastbootFlashResult, AppError> {
    FastbootConnection::flash_partition(&partition, &file_path).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_erase(partition: String) -> Result<(), AppError> {
    FastbootConnection::erase_partition(&partition).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_boot(file_path: String) -> Result<(), AppError> {
    FastbootConnection::boot_image(&file_path).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_reboot(mode: String) -> Result<(), AppError> {
    FastbootConnection::reboot(&mode).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_set_active_slot(slot: String) -> Result<(), AppError> {
    FastbootConnection::set_active_slot(&slot).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_oem(command: String) -> Result<(), AppError> {
    FastbootConnection::oem_command(&command).map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_oem_unlock() -> Result<(), AppError> {
    FastbootConnection::oem_unlock().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_oem_lock() -> Result<(), AppError> {
    FastbootConnection::oem_lock().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn fastboot_wait_for_device() -> Result<(), AppError> {
    FastbootConnection::wait_for_device(30).map_err(|e| AppError::command(e.to_string()))
}
