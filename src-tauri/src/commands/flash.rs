/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
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

#[tauri::command]
pub async fn xflash_rsc_flash(
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
        "XFlash RSC flashing partition '{}' with image: {} (operation_id: {})",
        partition,
        image_path,
        operation_id
    );

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec![
            "xflash".to_string(),
            "rsc-flash".to_string(),
            partition,
            image_path,
        ],
    )
    .await
}
