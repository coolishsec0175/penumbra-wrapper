/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::device_service::{self, DeviceService};
use tauri::{AppHandle, State, Window};

#[tauri::command]
pub async fn format_partition(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    partition: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Formatting partition '{}' (operation_id: {})", partition, operation_id);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::format_partition_direct(&device_service, &app, &operation_id, &partition)
}
