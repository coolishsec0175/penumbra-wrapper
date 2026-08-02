/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;

/// Writes `content` to `path`, used by the log panel's "Save" button.
/// Runs natively so the app can write to any path the user picks without
/// depending on webview fs plugin permissions.
#[tauri::command]
pub fn export_log_file(path: String, content: String) -> Result<(), AppError> {
    std::fs::write(&path, content).map_err(|err| {
        AppError::command(format!("Failed to write log file {}: {}", path, err))
    })?;
    Ok(())
}
