/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::commands::validate_input_file;
use crate::commands::validate_output_dir;
use crate::commands::validate_restore_dir;
use crate::error::AppError;
use crate::services::device_service::{self, DeviceService};
use tauri::{AppHandle, State, Window};

#[tauri::command]
pub async fn read_all_partitions(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    output_dir: String,
    skip_partitions: Vec<String>,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!(
        "Reading all partitions to directory: {} (operation_id: {}, skip: {:?})",
        output_dir,
        operation_id,
        skip_partitions
    );

    validate_output_dir(&output_dir, "Output directory")?;

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::read_all_partitions_direct(&device_service, &app, &operation_id, &output_dir, &skip_partitions)
}

#[tauri::command]
pub async fn write_all_partitions(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    input_dir: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!(
        "Writing all partitions from directory: {} (operation_id: {})",
        input_dir,
        operation_id
    );

    validate_output_dir(&input_dir, "Input directory")?;
    validate_restore_dir(&input_dir)?;

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::write_all_partitions_direct(&device_service, &app, &operation_id, &input_dir)
}

#[tauri::command]
pub async fn crash_command(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Crashing device for debug (operation_id: {})", operation_id);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    // Crash is a debug operation - reboot to test mode as approximation
    device_service::reboot_device_direct(&device_service, &app, &operation_id, "test")
}

#[tauri::command]
pub async fn seccfg_operation(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    action: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Seccfg operation '{}' (operation_id: {})", action, operation_id);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::seccfg_set_state(&device_service, &app, &operation_id, &action)
}

#[tauri::command]
pub async fn boot_pl(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    preloader_path: Option<String>,
    file_path: String,
    address: Option<String>,
    raw: bool,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!(
        "Boot PL: file={}, address={:?}, raw={}, operation_id={}",
        file_path,
        address,
        raw,
        operation_id
    );

    validate_input_file(&file_path, "Preloader file")?;

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    // Boot PL uses protocol-level boot_to which requires with_protocol access
    // For now, we read the file and use the device's protocol to boot it
    let pl_data = std::fs::read(&file_path)
        .map_err(|e| AppError::command(format!("Failed to read preloader file: {}", e)))?;

    let addr = address
        .and_then(|a| u32::from_str_radix(a.trim_start_matches("0x").trim_start_matches("0X"), 16).ok())
        .unwrap_or(0);

    crate::services::device_service::emit_output(&app, &operation_id, &format!("Booting preloader from {}...", file_path), false);

    device_service.with_device(|device| {
        device
            .with_protocol(|proto, port| {
                proto.boot_to(port, addr, &pl_data)
                    .map_err(|e| AppError::command(format!("Boot PL failed: {}", e)))
            })
            .map_err(|e| AppError::command(format!("Boot PL failed: {}", e)))?;

        crate::services::device_service::emit_output(&app, &operation_id, "Preloader booted", false);
        Ok(())
    })
}
