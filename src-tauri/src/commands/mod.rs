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
use crate::services::device_service::DeviceService;
use penumbra_mtk::VERSION;
use tauri::AppHandle;

pub use helpers::{
    emit_operation_complete, emit_operation_output,
    validate_da_preloader_paths, validate_input_file, validate_output_dir, validate_output_parent,
    validate_restore_dir,
};

#[tauri::command]
pub async fn get_penumbra_version(_app: AppHandle) -> Result<String, AppError> {
    Ok(format!("penumbra-mtk {}", VERSION))
}

#[tauri::command]
pub async fn cancel_operation(device_service: tauri::State<'_, DeviceService>) -> Result<(), AppError> {
    device_service.disconnect();
    Ok(())
}
