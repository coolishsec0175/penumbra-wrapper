/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::models::{FlashProgress, OperationCompleteEvent, OperationOutputEvent};
use chrono::Utc;
use std::fs::OpenOptions;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub fn emit_operation_output(app: &AppHandle, operation_id: &str, line: &str, is_stderr: bool) {
    let event = OperationOutputEvent {
        operation_id: operation_id.to_string(),
        line: line.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        is_stderr,
    };
    let _ = app.emit("operation:output", event);
}

pub fn emit_operation_complete(
    app: &AppHandle,
    operation_id: &str,
    success: bool,
    error: Option<String>,
) {
    let event = OperationCompleteEvent {
        operation_id: operation_id.to_string(),
        success,
        error,
    };
    let _ = app.emit("operation:complete", event);
}

pub fn emit_operation_progress(
    app: &AppHandle,
    current: u64,
    total: u64,
    partition_name: &str,
    operation: &str,
) {
    let pct = if total > 0 {
        current as f32 / total as f32 * 100.0
    } else {
        0.0
    };
    let event = FlashProgress {
        current,
        total,
        percentage: pct,
        partition_name: partition_name.to_string(),
        operation: operation.to_string(),
        speed_bytes_sec: None,
        elapsed_secs: None,
        eta_secs: None,
        message: None,
    };
    let _ = app.emit("operation:progress", event);
}

pub fn validate_da_preloader_paths(
    da_path: &str,
    preloader_path: Option<&str>,
) -> Result<(), AppError> {
    validate_input_file(da_path, "DA file")?;
    if let Some(path) = preloader_path {
        validate_input_file(path, "Preloader file")?;
    }
    Ok(())
}

pub fn validate_input_file(path: &str, label: &str) -> Result<(), AppError> {
    let target = Path::new(path);
    if !target.is_file() {
        return Err(AppError::command(format!("{} not found: {}", label, path)));
    }
    validate_readable_file(target, label)?;
    Ok(())
}

pub fn validate_output_dir(path: &str, label: &str) -> Result<(), AppError> {
    let target = Path::new(path);
    if !target.is_dir() {
        return Err(AppError::command(format!("{} not found: {}", label, path)));
    }
    validate_writable_dir(target, label)?;
    Ok(())
}

pub fn validate_restore_dir(path: &str) -> Result<(), AppError> {
    let target = Path::new(path);
    if !target.is_dir() {
        return Err(AppError::command(format!("Restore folder not found: {}", path)));
    }

    let has_images = std::fs::read_dir(target)
        .map_err(|err| {
            AppError::command(format!("Cannot read restore folder: {} ({})", path, err))
        })?
        .filter_map(Result::ok)
        .find(|entry| entry.file_type().map(|t| t.is_file()).unwrap_or(false))
        .is_some();

    if !has_images {
        return Err(AppError::command(format!(
            "No image files found in restore folder: {}",
            path
        )));
    }
    Ok(())
}

pub fn validate_output_parent(path: &str, label: &str) -> Result<(), AppError> {
    let parent = Path::new(path)
        .parent()
        .ok_or_else(|| AppError::command(format!("{} has no parent: {}", label, path)))?;

    if !parent.is_dir() {
        return Err(AppError::command(format!(
            "{} parent directory not found: {}",
            label,
            parent.display()
        )));
    }

    validate_writable_dir(parent, label)?;
    Ok(())
}

pub fn is_dir_writable(path: &Path) -> bool {
    let test_name = format!(".penumbra-write-test-{}", Uuid::new_v4());
    let test_path = path.join(test_name);
    if let Ok(file) = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&test_path)
    {
        drop(file);
        let _ = std::fs::remove_file(&test_path);
        return true;
    }
    false
}

fn validate_readable_file(path: &Path, label: &str) -> Result<(), AppError> {
    OpenOptions::new().read(true).open(path).map_err(|err| {
        AppError::command(format!(
            "{} not readable: {} ({})",
            label,
            path.display(),
            err
        ))
    })?;
    Ok(())
}

fn validate_writable_dir(path: &Path, label: &str) -> Result<(), AppError> {
    if !is_dir_writable(path) {
        return Err(AppError::command(format!(
            "{} not writable: {}",
            label,
            path.display()
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn test_is_dir_writable_on_temp() {
        assert!(is_dir_writable(&std::env::temp_dir()));
    }

    #[test]
    fn test_is_dir_writable_on_nonexistent() {
        assert!(!is_dir_writable(&PathBuf::from("/nonexistent/path")));
    }

    #[test]
    fn test_is_dir_writable_on_file() {
        let temp = std::env::temp_dir();
        let file_path = temp.join(".penumbra-write-test-file");
        fs::write(&file_path, "test").unwrap();
        assert!(!is_dir_writable(&file_path));
        let _ = fs::remove_file(&file_path);
    }

    #[test]
    fn test_validate_input_file_nonexistent() {
        assert!(validate_input_file("/nonexistent/file.txt", "Test").is_err());
    }

    #[test]
    fn test_validate_restore_dir_empty() {
        let temp = std::env::temp_dir().join(format!(".penumbra-empty-restore-{}", Uuid::new_v4()));
        fs::create_dir_all(&temp).unwrap();
        assert!(validate_restore_dir(&temp.to_string_lossy()).is_err());
        let _ = fs::remove_dir_all(&temp);
    }

    #[test]
    fn test_validate_restore_dir_with_images() {
        let temp = std::env::temp_dir().join(format!(".penumbra-restore-{}", Uuid::new_v4()));
        fs::create_dir_all(&temp).unwrap();
        fs::write(temp.join("super.img"), "test").unwrap();
        assert!(validate_restore_dir(&temp.to_string_lossy()).is_ok());
        let _ = fs::remove_dir_all(&temp);
    }

    #[test]
    fn test_validate_da_preloader_paths_nonexistent() {
        assert!(validate_da_preloader_paths("/nonexistent/da.bin", None).is_err());
    }
}
