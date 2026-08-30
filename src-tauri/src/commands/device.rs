/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::models::{DeviceInfo, Partition, PartitionListResult};
use crate::services::device_service::{self, DeviceService};
use tauri::{AppHandle, State, Window};
use uuid::Uuid;

#[tauri::command]
pub async fn reboot_device(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    mode: String,
    preloader_path: Option<String>,
) -> Result<(), AppError> {
    log::info!("Rebooting device to {} mode with DA: {}", mode, da_path);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    let operation_id = Uuid::new_v4().to_string();
    device_service::reboot_device_direct(&device_service, &app, &operation_id, &mode)
}

#[tauri::command]
pub async fn shutdown_device(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    preloader_path: Option<String>,
) -> Result<(), AppError> {
    log::info!("Shutting down device with DA: {}", da_path);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    let operation_id = Uuid::new_v4().to_string();
    device_service::shutdown_device_direct(&device_service, &app, &operation_id)
}

#[tauri::command]
pub async fn list_partitions(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    preloader_path: Option<String>,
    _window: Window,
) -> Result<PartitionListResult, AppError> {
    log::info!("Listing partitions with DA: {}", da_path);

    let _ = crate::services::device_discovery::ensure_udev_rules(Some(&app));

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    let operation_id = Uuid::new_v4().to_string();
    let partitions = device_service::list_partitions_direct(&device_service, &app, &operation_id)?;

    Ok(PartitionListResult {
        partitions,
        operation_id,
    })
}

#[tauri::command]
pub async fn get_device_info(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    preloader_path: Option<String>,
) -> Result<DeviceInfo, AppError> {
    log::info!("Getting device info with DA: {}", da_path);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    let operation_id = Uuid::new_v4().to_string();
    device_service::get_device_info(&device_service, &app, &operation_id)
}
