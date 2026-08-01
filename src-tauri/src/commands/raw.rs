/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::commands::{execute_antumbra_command, validate_input_file, validate_output_parent};
use crate::error::AppError;
use tauri::{AppHandle, Window};

#[tauri::command]
pub async fn peek_memory(
    app: AppHandle,
    da_path: String,
    address: String,
    length: String,
    output_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_output_parent(&output_path, "Output file")?;
    log::info!(
        "Peeking memory at {} length {} to {} (operation_id: {})",
        address,
        length,
        output_path,
        operation_id
    );

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec![
            "peek".to_string(),
            address,
            length,
            output_path,
        ],
    )
    .await
}

#[tauri::command]
pub async fn poke_memory(
    app: AppHandle,
    da_path: String,
    address: String,
    input_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_input_file(&input_path, "Input file")?;
    log::info!(
        "Poking memory at {} from {} (operation_id: {})",
        address,
        input_path,
        operation_id
    );

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec!["poke".to_string(), address, input_path],
    )
    .await
}

#[tauri::command]
pub async fn read_offset(
    app: AppHandle,
    da_path: String,
    address: String,
    length: String,
    output_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_output_parent(&output_path, "Output file")?;
    log::info!(
        "Reading flash at offset {} length {} to {} (operation_id: {})",
        address,
        length,
        output_path,
        operation_id
    );

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec![
            "read-offset".to_string(),
            address,
            length,
            output_path,
        ],
    )
    .await
}

#[tauri::command]
pub async fn write_offset(
    app: AppHandle,
    da_path: String,
    address: String,
    length: String,
    input_path: String,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_input_file(&input_path, "Input file")?;
    log::info!(
        "Writing flash at offset {} length {} from {} (operation_id: {})",
        address,
        length,
        input_path,
        operation_id
    );

    execute_antumbra_command(
        app,
        operation_id,
        &da_path,
        preloader_path.as_deref(),
        vec![
            "write-offset".to_string(),
            address,
            length,
            input_path,
        ],
    )
    .await
}

#[tauri::command]
pub async fn rpmb_read(
    app: AppHandle,
    da_path: String,
    output_path: String,
    region: Option<u8>,
    start_sector: Option<u32>,
    num_sectors: Option<u32>,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_output_parent(&output_path, "Output file")?;
    log::info!("Reading RPMB to {} (operation_id: {})", output_path, operation_id);

    let mut args = vec!["rpmb".to_string(), "read".to_string()];
    append_rpmb_flags(&mut args, region, start_sector, num_sectors);
    args.push(output_path);

    execute_antumbra_command(app, operation_id, &da_path, preloader_path.as_deref(), args).await
}

#[tauri::command]
pub async fn rpmb_write(
    app: AppHandle,
    da_path: String,
    input_path: String,
    region: Option<u8>,
    start_sector: Option<u32>,
    num_sectors: Option<u32>,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    validate_input_file(&input_path, "Input file")?;
    log::info!("Writing RPMB from {} (operation_id: {})", input_path, operation_id);

    let mut args = vec!["rpmb".to_string(), "write".to_string()];
    append_rpmb_flags(&mut args, region, start_sector, num_sectors);
    args.push(input_path);

    execute_antumbra_command(app, operation_id, &da_path, preloader_path.as_deref(), args).await
}

#[tauri::command]
pub async fn rpmb_auth(
    app: AppHandle,
    da_path: String,
    key: String,
    region: Option<u8>,
    preloader_path: Option<String>,
    operation_id: String,
    _window: Window,
) -> Result<(), AppError> {
    if key.is_empty() {
        return Err(AppError::command("RPMB auth key cannot be empty".to_string()));
    }
    log::info!("Authenticating RPMB (operation_id: {})", operation_id);

    let mut args = vec!["rpmb".to_string(), "auth".to_string()];
    if let Some(region) = region {
        args.push("--region".to_string());
        args.push(region.to_string());
    }
    args.push(key);

    execute_antumbra_command(app, operation_id, &da_path, preloader_path.as_deref(), args).await
}

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

fn append_rpmb_flags(
    args: &mut Vec<String>,
    region: Option<u8>,
    start_sector: Option<u32>,
    num_sectors: Option<u32>,
) {
    if let Some(region) = region {
        args.push("--region".to_string());
        args.push(region.to_string());
    }
    if let Some(start_sector) = start_sector {
        args.push("--start-sector".to_string());
        args.push(start_sector.to_string());
    }
    if let Some(num_sectors) = num_sectors {
        args.push("--num-sectors".to_string());
        args.push(num_sectors.to_string());
    }
}
