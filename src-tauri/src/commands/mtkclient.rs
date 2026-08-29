/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::mtkclient::{kill_mtk_process, MtkclientExecutor, MtkStatus};
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn mtk_status(app: AppHandle, is_iot: bool) -> Result<MtkStatus, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;
    Ok(executor.get_status())
}

#[tauri::command]
pub async fn mtk_cancel_operation() -> Result<(), AppError> {
    kill_mtk_process().map_err(|e| AppError::command(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn mtk_print_gpt(
    app: AppHandle,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["printgpt".to_string()];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_read_partition(
    app: AppHandle,
    partition: String,
    output_file: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["r".to_string(), partition.clone(), output_file];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_write_partition(
    app: AppHandle,
    partition: String,
    input_file: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["w".to_string(), partition.clone(), input_file];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_erase_partition(
    app: AppHandle,
    partition: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["e".to_string(), partition.clone()];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_dump_brom(
    app: AppHandle,
    output_file: Option<String>,
    is_iot: bool,
    preloader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["dumpbrom".to_string()];
    if let Some(out) = output_file {
        args.push(out);
    }
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_dump_preloader(
    app: AppHandle,
    output_file: Option<String>,
    is_iot: bool,
    preloader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["dumppreloader".to_string()];
    if let Some(out) = output_file {
        args.push(out);
    }
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_dump_sram(
    app: AppHandle,
    output_file: Option<String>,
    is_iot: bool,
    preloader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["dumpsram".to_string()];
    if let Some(out) = output_file {
        args.push(out);
    }
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_crash(
    app: AppHandle,
    is_iot: bool,
    preloader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["crash".to_string()];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_reboot(
    app: AppHandle,
    is_iot: bool,
    preloader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["reset".to_string()];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_seccfg(
    app: AppHandle,
    action: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["da".to_string(), "seccfg".to_string(), action];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_generate_keys(
    app: AppHandle,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["da".to_string(), "generatekeys".to_string()];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_read_all(
    app: AppHandle,
    output_dir: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["rl".to_string(), output_dir];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_write_all(
    app: AppHandle,
    input_dir: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["wl".to_string(), input_dir];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn mtk_set_active_slot(
    app: AppHandle,
    slot: String,
    is_iot: bool,
    preloader: Option<String>,
    da_loader: Option<String>,
) -> Result<String, AppError> {
    let executor = MtkclientExecutor::new(&app, is_iot)
        .map_err(|e| AppError::command(e.to_string()))?;

    let mut args = vec!["da".to_string(), "seccfg".to_string(), "active".to_string(), slot];
    if let Some(pl) = preloader {
        args.push("--preloader".to_string());
        args.push(pl);
    }
    if let Some(da) = da_loader {
        args.push("--da".to_string());
        args.push(da);
    }

    executor
        .execute_streaming(app, Uuid::new_v4().to_string(), args)
        .await
        .map_err(|e| AppError::command(e.to_string()))
}
