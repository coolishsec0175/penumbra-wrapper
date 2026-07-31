use crate::error::AppError;
use crate::models::{FlashProgress, OperationCompleteEvent, OperationOutputEvent};
use crate::services::antumbra::AntumbraExecutor;
use crate::services::device_discovery;
use chrono::Utc;
use std::fs::OpenOptions;
use std::path::Path;
use std::time::Duration;
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
    };
    let _ = app.emit("operation:progress", event);
}

pub fn result_with_emit<T>(
    result: Result<T, AppError>,
    app: &AppHandle,
    op_id: &str,
) -> Result<T, AppError> {
    match result {
        Ok(val) => Ok(val),
        Err(err) => {
            emit_operation_output(app, op_id, &err.message(), true);
            emit_operation_complete(app, op_id, false, Some(err.message()));
            Err(err)
        }
    }
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

pub fn build_antumbra_args(
    da_path: &str,
    preloader_path: Option<&str>,
    command_args: Vec<String>,
) -> Vec<String> {
    let mut args = Vec::with_capacity(command_args.len() + 4);
    args.push("--da".to_string());
    args.push(da_path.to_string());

    if let Some(pl) = preloader_path {
        args.push("--pl".to_string());
        args.push(pl.to_string());
    }

    args.extend(command_args);
    args
}

fn is_download_command(args: &[String]) -> bool {
    matches!(
        args.first().map(String::as_str),
        Some("download" | "dl" | "write" | "w")
    )
}

fn log_input_file_size(args: &[String]) {
    let Some(command) = args.first().map(String::as_str) else {
        return;
    };

    let path_arg = match command {
        "download" | "dl" | "write" | "w" => args.get(2),
        _ => None,
    };

    if let Some(path) = path_arg {
        match std::fs::metadata(path) {
            Ok(metadata) => log::info!(
                "Antumbra input file size: {} bytes ({})",
                metadata.len(),
                path
            ),
            Err(err) => log::warn!(
                "Failed to read Antumbra input file metadata for {}: {}",
                path,
                err
            ),
        }
    }
}

pub async fn execute_antumbra_command(
    app: AppHandle,
    operation_id: String,
    da_path: &str,
    preloader_path: Option<&str>,
    args: Vec<String>,
) -> Result<(), AppError> {
    log::info!(
        "execute_antumbra_command: op={}, da={:?}, preloader={:?}, args={:?}",
        operation_id,
        da_path,
        preloader_path,
        args
    );

    if let Ok(true) = device_discovery::ensure_udev_rules(Some(&app)) {
        emit_operation_output(
            &app,
            &operation_id,
            "MediaTek udev rules installed for device access.",
            false,
        );
    }

    validate_da_preloader_paths(da_path, preloader_path)?;
    let executor = AntumbraExecutor::new(&app)?;
    log_input_file_size(&args);

    let should_retry_timeout = !is_download_command(&args);
    let max_attempts = if should_retry_timeout { 2 } else { 1 };
    let cmd_args = build_antumbra_args(da_path, preloader_path, args);

    let mut last_error: Option<String> = None;

    for attempt in 1..=max_attempts {
        match executor
            .execute_streaming(app.clone(), operation_id.clone(), cmd_args.clone())
            .await
        {
            Ok(_) => return Ok(()),
            Err(e) => {
                let err_str = e.to_string();
                if should_retry_timeout
                    && attempt < max_attempts
                    && err_str.to_lowercase().contains("timeout")
                {
                    log::warn!(
                        "Antumbra timed out (attempt {}/{}), retrying...",
                        attempt,
                        max_attempts
                    );
                    emit_operation_output(
                        &app,
                        &operation_id,
                        &format!("Timed out, retrying... ({}/{})", attempt, max_attempts),
                        true,
                    );
                    tokio::time::sleep(Duration::from_secs(3)).await;
                    last_error = Some(err_str);
                } else {
                    return Err(AppError::command(err_str));
                }
            }
        }
    }

    Err(AppError::command(format!(
        "Antumbra process failed after {} attempts: {}",
        max_attempts,
        last_error.as_deref().unwrap_or("unknown")
    )))
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
    fn test_validate_da_preloader_paths_nonexistent() {
        assert!(validate_da_preloader_paths("/nonexistent/da.bin", None).is_err());
    }

    #[test]
    fn build_antumbra_args_places_da_before_command() {
        let args = build_antumbra_args(
            "/tmp/DA.bin",
            None,
            vec![
                "download".to_string(),
                "super".to_string(),
                "super.img".to_string(),
            ],
        );

        assert_eq!(
            args,
            vec![
                "--da".to_string(),
                "/tmp/DA.bin".to_string(),
                "download".to_string(),
                "super".to_string(),
                "super.img".to_string(),
            ]
        );
    }

    #[test]
    fn build_antumbra_args_places_preloader_before_command() {
        let args = build_antumbra_args(
            "/tmp/DA.bin",
            Some("/tmp/preloader.bin"),
            vec!["pgpt".to_string()],
        );

        assert_eq!(
            args,
            vec![
                "--da".to_string(),
                "/tmp/DA.bin".to_string(),
                "--pl".to_string(),
                "/tmp/preloader.bin".to_string(),
                "pgpt".to_string(),
            ]
        );
    }

    #[test]
    fn download_commands_do_not_retry_timeout() {
        assert!(is_download_command(&["download".to_string()]));
        assert!(is_download_command(&["write".to_string()]));
    }

    #[test]
    fn non_download_commands_can_retry_timeout() {
        assert!(!is_download_command(&["pgpt".to_string()]));
        assert!(!is_download_command(&["upload".to_string()]));
    }
}
