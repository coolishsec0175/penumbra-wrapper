/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::device_service::{self, DeviceService};
use tauri::{AppHandle, State, Window};

#[tauri::command]
pub async fn set_active_slot(
    app: AppHandle,
    device_service: State<'_, DeviceService>,
    da_path: String,
    slot: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    let slot = slot.to_lowercase();
    if slot != "a" && slot != "b" {
        return Err(AppError::command(format!("Invalid slot '{}'. Expected 'a' or 'b'.", slot)));
    }
    log::info!("Setting active boot slot to {} (operation_id: {})", slot, operation_id);

    super::flash::ensure_connected(&device_service, &da_path, preloader_path.as_deref())?;

    device_service::set_active_slot_direct(&device_service, &app, &operation_id, &slot)
}
