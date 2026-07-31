/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::execute_antumbra_command;
use crate::commands::validate_output_dir;
use crate::error::AppError;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn read_all_partitions(
    app: AppHandle,
    da_path: String,
    output_dir: String,
    skip_partitions: Vec<String>,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!(
        "Reading all partitions to directory: {} (operation_id: {}, skip: {:?})",
        output_dir,
        operation_id,
        skip_partitions
    );

    validate_output_dir(&output_dir, "Output directory")?;

    let mut args = vec!["read-all".to_string(), output_dir];
    for partition in skip_partitions {
        args.push("--skip".to_string());
        args.push(partition);
    }

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        args,
    )
    .await
}

#[tauri::command]
pub async fn seccfg_operation(
    app: AppHandle,
    da_path: String,
    action: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    log::info!("Seccfg operation '{}' (operation_id: {})", action, operation_id);

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec!["seccfg".to_string(), action],
    )
    .await
}
