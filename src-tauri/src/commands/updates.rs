/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::antumbra::get_antumbra_updatable_path as resolve_antumbra_updatable_path;
use crate::services::antumbra_update::{
    AntumbraUpdateInfo, AntumbraUpdateResult, check_for_updates, download_and_install,
};
use tauri::AppHandle;

#[tauri::command]
pub async fn get_antumbra_updatable_path(app: AppHandle) -> Result<String, AppError> {
    let path = resolve_antumbra_updatable_path(&app)?;
    Ok(path.display().to_string())
}

#[tauri::command]
pub async fn check_antumbra_update(app: AppHandle) -> Result<AntumbraUpdateInfo, AppError> {
    check_for_updates(&app).await.map_err(|e| e.into())
}

#[tauri::command]
pub async fn download_antumbra_update(app: AppHandle) -> Result<AntumbraUpdateResult, AppError> {
    download_and_install(&app).await.map_err(|e| e.into())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AntumbraReleaseNote {
    pub tag_name: String,
    pub name: String,
    pub body: Option<String>,
    pub published_at: Option<String>,
}

#[tauri::command]
pub async fn get_antumbra_changelog() -> Result<Vec<AntumbraReleaseNote>, AppError> {
    crate::services::antumbra_update::fetch_release_notes()
        .await
        .map_err(|e| AppError::command(e.to_string()))
}
