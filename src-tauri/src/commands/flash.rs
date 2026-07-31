/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::execute_antumbra_command;
use crate::commands::validate_input_file;
use crate::error::AppError;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn flash_partition(
    app: AppHandle,
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

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec!["download".to_string(), partition, image_path],
    )
    .await
}
