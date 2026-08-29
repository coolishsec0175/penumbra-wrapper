/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::models::{OperationCompleteEvent, OperationOutputEvent};
use anyhow::{Context, Result};
use chrono::Utc;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncReadExt;
use tokio::process::Command as TokioCommand;

/// Check if mtkclient process is currently running
static MTK_RUNNING: AtomicBool = AtomicBool::new(false);
static MTK_PID: OnceLock<Mutex<Option<u32>>> = OnceLock::new();

pub struct MtkclientExecutor {
    python_path: PathBuf,
    mtkclient_dir: PathBuf,
    is_iot: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MtkStatus {
    pub available: bool,
    pub python_path: String,
    pub mtkclient_path: String,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MtkDeviceInfo {
    pub chip: Option<String>,
    pub hw_code: Option<String>,
    pub hw_sub_code: Option<String>,
    pub hw_version: Option<String>,
    pub sw_version: Option<String>,
    pub boot_type: Option<String>,
    pub board: Option<String>,
    pub storage: Option<String>,
    pub ram: Option<String>,
}

fn python_name() -> &'static str {
    if cfg!(windows) {
        "python"
    } else {
        "python3"
    }
}

impl MtkclientExecutor {
    pub fn new(app: &AppHandle, is_iot: bool) -> Result<Self> {
        let settings = crate::services::config::load_settings()
            .context("Failed to load settings for mtkclient")?;

        let python_path = settings
            .mtkclient_python_path
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(python_name()));

        let mtkclient_dir = settings
            .mtkclient_path
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                // Try to find mtkclient in common locations
                let config_dir = app
                    .path()
                    .app_config_dir()
                    .unwrap_or_else(|_| std::env::temp_dir().join("penumbra-wrapper"));
                config_dir.join("mtkclient")
            });

        log::info!(
            "MtkclientExecutor: python={:?}, mtkclient_dir={:?}, iot={}",
            python_path,
            mtkclient_dir,
            is_iot
        );

        Ok(Self {
            python_path,
            mtkclient_dir,
            is_iot,
        })
    }

    /// Check if mtkclient is available and return status
    pub fn get_status(&self) -> MtkStatus {
        let python_check = std::process::Command::new(&self.python_path)
            .arg("--version")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        match python_check {
            Ok(output) => {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let mtkclient_script = self.mtkclient_dir.join("mtkclient");
                let available = mtkclient_script.exists()
                    || self.mtkclient_dir.join("mtkclient.py").exists();

                MtkStatus {
                    available,
                    python_path: self.python_path.display().to_string(),
                    mtkclient_path: self.mtkclient_dir.display().to_string(),
                    version: Some(version),
                    error: if available {
                        None
                    } else {
                        Some("mtkclient not found in configured path".to_string())
                    },
                }
            }
            Err(e) => MtkStatus {
                available: false,
                python_path: self.python_path.display().to_string(),
                mtkclient_path: self.mtkclient_dir.display().to_string(),
                version: None,
                error: Some(format!("Python not found: {}", e)),
            },
        }
    }

    /// Build the base command arguments for mtkclient
    fn build_args(&self, extra_args: Vec<String>) -> Vec<String> {
        let mut args = vec![];

        if self.is_iot {
            args.push("--iot".to_string());
        }

        args.extend(extra_args);
        args
    }

    /// Execute mtkclient with real-time streaming output
    pub async fn execute_streaming(
        &self,
        app: AppHandle,
        operation_id: String,
        args: Vec<String>,
    ) -> Result<String> {
        let full_args = self.build_args(args);

        // Build the mtkclient invocation
        // python <mtkclient_dir>/mtkclient.py [args...]
        let script_path = if self.mtkclient_dir.join("mtkclient.py").exists() {
            self.mtkclient_dir.join("mtkclient.py")
        } else {
            self.mtkclient_dir.join("mtkclient")
        };

        log::info!(
            "Executing mtkclient: python={:?}, script={:?}, args={:?}",
            self.python_path,
            script_path,
            full_args
        );

        if !script_path.exists() {
            anyhow::bail!(
                "mtkclient script not found at {:?}. Please install mtkclient or configure the path in Settings.",
                script_path
            );
        }

        let mut cmd_args = vec![script_path.display().to_string()];
        cmd_args.extend(full_args.clone());

        let started_at = Instant::now();

        let mut child = {
            #[cfg(windows)]
            {
                let mut cmd = TokioCommand::new(&self.python_path);
                cmd.args(&cmd_args)
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped());
                cmd.creation_flags(0x08000000);
                cmd
            }
            #[cfg(not(windows))]
            {
                TokioCommand::new(&self.python_path)
                    .args(&cmd_args)
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
            }
        }
        .spawn()
        .context("Failed to spawn mtkclient process")?;

        set_mtk_pid(child.id());
        MTK_RUNNING.store(true, Ordering::SeqCst);

        let stdout = child.stdout.take().context("Failed to take stdout")?;
        let stderr = child.stderr.take().context("Failed to take stderr")?;

        let stdout_lines = Arc::new(Mutex::new(Vec::new()));
        let stderr_lines = Arc::new(Mutex::new(Vec::new()));
        let seen_lines = Arc::new(Mutex::new(HashSet::new()));

        let app_clone1 = app.clone();
        let op_id_clone1 = operation_id.clone();
        let stdout_lines_clone = stdout_lines.clone();
        let seen_clone1 = seen_lines.clone();
        let stdout_task = tokio::spawn(async move {
            stream_mtk_lines(
                stdout,
                app_clone1,
                op_id_clone1,
                false,
                stdout_lines_clone,
                seen_clone1,
            )
            .await;
        });

        let app_clone2 = app.clone();
        let op_id_clone2 = operation_id.clone();
        let stderr_lines_clone = stderr_lines.clone();
        let seen_clone2 = seen_lines.clone();
        let stderr_task = tokio::spawn(async move {
            stream_mtk_lines(
                stderr,
                app_clone2,
                op_id_clone2,
                true,
                stderr_lines_clone,
                seen_clone2,
            )
            .await;
        });

        let status = child
            .wait()
            .await
            .context("Failed to wait for mtkclient process")?;

        let _ = tokio::join!(stdout_task, stderr_task);

        let stdout_output = stdout_lines
            .lock()
            .map(|lines| lines.join("\n"))
            .unwrap_or_default();
        let stderr_output = stderr_lines
            .lock()
            .map(|lines| lines.join("\n"))
            .unwrap_or_default();

        log::info!(
            "mtkclient finished: success={}, status={:?}, duration_ms={}",
            status.success(),
            status.code(),
            started_at.elapsed().as_millis()
        );

        clear_mtk_pid();
        MTK_RUNNING.store(false, Ordering::SeqCst);

        let complete_event = OperationCompleteEvent {
            operation_id: operation_id.clone(),
            success: status.success(),
            error: if status.success() {
                None
            } else {
                Some(stderr_output.clone())
            },
        };

        app.emit("operation:complete", complete_event)
            .context("Failed to emit completion event")?;

        if !status.success() {
            anyhow::bail!("mtkclient failed: {}", stderr_output);
        }

        Ok(stdout_output)
    }
}

async fn stream_mtk_lines<R>(
    mut reader: R,
    app: AppHandle,
    operation_id: String,
    is_stderr: bool,
    lines_storage: Arc<Mutex<Vec<String>>>,
    seen_lines: Arc<Mutex<HashSet<String>>>,
) where
    R: AsyncReadExt + Unpin,
{
    let mut buffer = Vec::new();
    let mut byte = [0u8; 1];

    while reader.read_exact(&mut byte).await.is_ok() {
        if byte[0] == b'\n' || byte[0] == b'\r' {
            if !buffer.is_empty() {
                if let Ok(line) = String::from_utf8(buffer.clone()) {
                    let line = line.trim().to_string();
                    if !line.is_empty() {
                        let should_emit = match seen_lines.lock() {
                            Ok(mut seen) => {
                                if seen.contains(&line) {
                                    false
                                } else {
                                    seen.insert(line.clone());
                                    true
                                }
                            }
                            Err(_) => true,
                        };

                        if should_emit {
                            if let Ok(mut storage) = lines_storage.lock() {
                                storage.push(line.clone());
                            }

                            let timestamp = Utc::now().to_rfc3339();
                            let event = OperationOutputEvent {
                                operation_id: operation_id.clone(),
                                line,
                                timestamp,
                                is_stderr,
                            };
                            let _ = app.emit("operation:output", event);
                        }
                    }
                }
                buffer.clear();
            }
        } else {
            buffer.push(byte[0]);
        }
    }
}

fn set_mtk_pid(pid: Option<u32>) {
    let store = MTK_PID.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = pid;
    }
}

fn clear_mtk_pid() {
    set_mtk_pid(None);
}

pub fn kill_mtk_process() -> Result<()> {
    let store = MTK_PID.get_or_init(|| Mutex::new(None));
    let pid = store.lock().ok().and_then(|guard| *guard);

    if let Some(pid) = pid {
        log::info!("Killing mtkclient process (pid: {})", pid);
        #[cfg(unix)]
        unsafe {
            libc::kill(pid as i32, libc::SIGKILL);
        }
        #[cfg(windows)]
        {
            use winapi::um::handleapi::CloseHandle;
            use winapi::um::processthreadsapi::{OpenProcess, TerminateProcess};
            use winapi::um::winnt::{HANDLE, PROCESS_TERMINATE};

            unsafe {
                let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
                if !handle.is_null() {
                    TerminateProcess(handle as HANDLE, 1);
                    CloseHandle(handle);
                }
            }
        }
    }

    clear_mtk_pid();
    MTK_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}

pub fn is_mtk_running() -> bool {
    MTK_RUNNING.load(Ordering::SeqCst)
}
