/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::commands::validate_output_parent;
use crate::error::AppError;
use crate::services::device_service::{self, DeviceService};
use tauri::{AppHandle, State, Window};

#[tauri::command]
pub async fn read_partition(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    partition: String,
    output_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_output_parent(&output_path, "Output file")?;
    log::info!(
        "Reading partition '{}' to file: {} (operation_id: {})",
        partition,
        output_path,
        operation_id
    );

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::read_partition_to_file(&device_service, &app, &operation_id, &partition, &output_path)
}
