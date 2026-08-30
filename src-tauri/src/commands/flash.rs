/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::commands::validate_input_file;
use crate::error::AppError;
use crate::services::device_service::{self, DeviceService};
use tauri::{AppHandle, State, Window};

#[tauri::command]
pub async fn flash_partition(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    partition: String,
    image_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_input_file(&image_path, "Image file")?;
    log::info!(
        "Flashing partition '{}' with image: {} (operation_id: {})",
        partition,
        image_path,
        operation_id
    );

    ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::flash_partition(&device_service, &app, &operation_id, &partition, &image_path)
}

#[tauri::command]
pub async fn flash_scatter(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    scatter_path: String,
    firmware_dir: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_input_file(&scatter_path, "Scatter file")?;
    log::info!(
        "Flash scatter: scatter={}, firmware_dir={}, operation_id={}",
        scatter_path,
        firmware_dir,
        operation_id
    );

    ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::flash_scatter_direct(&device_service, &app, &operation_id, &scatter_path, &firmware_dir)
}

pub fn ensure_connected(
    service: &DeviceService,
    da_path: &str,
    preloader_path: Option<&str>,
) -> Result<(), AppError> {
    if !service.is_connected() {
        let auth_path = crate::services::config::load_settings()
            .ok()
            .and_then(|s| s.auth_path);
        service.connect(da_path, preloader_path, auth_path.as_deref())?;
    }
    Ok(())
}
