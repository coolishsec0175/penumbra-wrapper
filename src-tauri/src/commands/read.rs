/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::execute_antumbra_command;
use crate::commands::validate_output_parent;
use crate::error::AppError;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn read_partition(
    app: AppHandle,
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

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec!["upload".to_string(), partition, output_path],
    )
    .await
}
