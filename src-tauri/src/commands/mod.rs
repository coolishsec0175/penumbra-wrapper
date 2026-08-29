/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

pub mod device;
pub mod erase;
pub mod fastboot;
pub mod fastboot_native;
pub mod flash;
pub mod format;
pub mod helpers;
pub mod logs;
pub mod mtkclient;
pub mod raw;
pub mod read;
pub mod scatter;
pub mod settings;
pub mod tools;
pub mod updates;
pub mod amonet;
pub mod adb;

use crate::error::AppError;
use crate::services::antumbra::{kill_current_process, AntumbraExecutor};
use tauri::AppHandle;

pub use helpers::{
    build_antumbra_args, emit_operation_complete, emit_operation_output, execute_antumbra_command,
    validate_da_preloader_paths, validate_input_file, validate_output_dir, validate_output_parent,
    validate_restore_dir,
};

#[tauri::command]
pub async fn get_antumbra_version(app: AppHandle) -> Result<String, AppError> {
    let executor = AntumbraExecutor::new(&app)?;
    executor
        .get_version()
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn cancel_operation(app: AppHandle) -> Result<(), AppError> {
    let _ = AntumbraExecutor::new(&app)?;
    kill_current_process().map_err(|e| AppError::command(e.to_string()))?;
    Ok(())
}
