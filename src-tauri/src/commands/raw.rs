/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::commands::execute_antumbra_command;
use crate::error::AppError;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn set_active_slot(
    app: AppHandle,
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

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec!["set-active-slot".to_string(), slot],
    )
    .await
}
