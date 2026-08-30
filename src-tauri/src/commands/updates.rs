/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use penumbra_mtk::VERSION;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_penumbra_version() -> Result<String, AppError> {
    Ok(format!("penumbra-mtk {}", VERSION))
}

#[tauri::command]
pub async fn check_penumbra_update() -> Result<PenumbraUpdateInfo, AppError> {
    // TODO: Check GitHub releases of the wrapper repo for updates
    Ok(PenumbraUpdateInfo {
        current_version: VERSION.to_string(),
        latest_version: VERSION.to_string(),
        update_available: false,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenumbraUpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
}
