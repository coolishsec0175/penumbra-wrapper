/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::execute_antumbra_command;
use crate::error::AppError;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn erase_partition(
    app: AppHandle,
    da_path: String,
    partition: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Erasing partition '{}' (operation_id: {})", partition, operation_id);

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec!["erase".to_string(), partition],
    )
    .await
}
