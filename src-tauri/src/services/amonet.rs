/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

//! Amonet - MTK BROM exploit via mtkclient subprocess
//!
//! Spawns mtkclient (Python) as a subprocess to perform BROM exploits.
//! Supports all payload types from shomykohai/mtk-payloads.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::AppHandle;
use tokio::io::AsyncReadExt;
use tokio::process::Command as TokioCommand;

static AMONET_RUNNING: AtomicBool = AtomicBool::new(false);
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);
static AMONET_PID: OnceLock<Mutex<Option<u32>>> = OnceLock::new();

/// Payload types from shomykohai/mtk-payloads
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PayloadType {
    BromDefuse,
    ExtloaderV5,
    ExtloaderV6Arm,
    ExtloaderV6Arm64,
    HakujoudaiArm,
    HakujoudaiArm64,
    SlaXmlArm,
    SlaXmlArm64,
    DaX,
    DaXmlArm,
    DaXmlArm64,
}

impl PayloadType {
    pub fn filename(&self) -> &str {
        match self {
            PayloadType::BromDefuse => "brom_defuse.bin",
            PayloadType::ExtloaderV5 => "extloader_v5.bin",
            PayloadType::ExtloaderV6Arm => "extloaderv6_arm.bin",
            PayloadType::ExtloaderV6Arm64 => "extloaderv6_arm64.bin",
            PayloadType::HakujoudaiArm => "hakujoudai_arm.bin",
            PayloadType::HakujoudaiArm64 => "hakujoudai_arm64.bin",
            PayloadType::SlaXmlArm => "sla_xml_arm.bin",
            PayloadType::SlaXmlArm64 => "sla_xml_arm64.bin",
            PayloadType::DaX => "da_x.bin",
            PayloadType::DaXmlArm => "da_xml_arm.bin",
            PayloadType::DaXmlArm64 => "da_xml_arm64.bin",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            PayloadType::BromDefuse => "BROM Defuse (Legacy/V5)",
            PayloadType::ExtloaderV5 => "Extloader V5",
            PayloadType::ExtloaderV6Arm => "Extloader V6 (ARM32)",
            PayloadType::ExtloaderV6Arm64 => "Extloader V6 (ARM64)",
            PayloadType::HakujoudaiArm => "Hakujoudai (ARM32)",
            PayloadType::HakujoudaiArm64 => "Hakujoudai (ARM64)",
            PayloadType::SlaXmlArm => "SLA XML (ARM32)",
            PayloadType::SlaXmlArm64 => "SLA XML (ARM64)",
            PayloadType::DaX => "DA Extensions (V5/XFlash)",
            PayloadType::DaXmlArm => "DA Extensions (V6/XML ARM32)",
            PayloadType::DaXmlArm64 => "DA Extensions (V6/XML ARM64)",
        }
    }

    pub fn description(&self) -> &str {
        match self {
            PayloadType::BromDefuse => "Disables SLA/DAA/SBC security checks in BootROM.",
            PayloadType::ExtloaderV5 => "Restores boot_to command to V5 DAs.",
            PayloadType::ExtloaderV6Arm => "DA extension loader for V6 XML devices (ARM32).",
            PayloadType::ExtloaderV6Arm64 => "DA extension loader for V6 XML devices (ARM64).",
            PayloadType::HakujoudaiArm => "V6 heap exploit (heapb8) for ARM32.",
            PayloadType::HakujoudaiArm64 => "V6 heap exploit (heapb8) for AArch64.",
            PayloadType::SlaXmlArm => "SLA bypass for V6 XML devices (ARM32).",
            PayloadType::SlaXmlArm64 => "SLA bypass for V6 XML devices (ARM64).",
            PayloadType::DaX => "DA extensions for V5/XFlash devices.",
            PayloadType::DaXmlArm => "DA extensions for V6/XML devices (ARM32).",
            PayloadType::DaXmlArm64 => "DA extensions for V6/XML devices (ARM64).",
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::BromDefuse,
            Self::ExtloaderV5,
            Self::ExtloaderV6Arm,
            Self::ExtloaderV6Arm64,
            Self::HakujoudaiArm,
            Self::HakujoudaiArm64,
            Self::SlaXmlArm,
            Self::SlaXmlArm64,
            Self::DaX,
            Self::DaXmlArm,
            Self::DaXmlArm64,
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmonetConfig {
    pub payload_type: PayloadType,
    pub port: Option<String>,
    pub baud_rate: u32,
    pub custom_payload_path: Option<String>,
    pub timeout_ms: u64,
}

impl Default for AmonetConfig {
    fn default() -> Self {
        Self {
            payload_type: PayloadType::BromDefuse,
            port: None,
            baud_rate: 115200,
            custom_payload_path: None,
            timeout_ms: 30000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AmonetStatus {
    Scanning,
    Connecting,
    Exploiting,
    Success,
    Failed(String),
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmonetEvent {
    pub status: AmonetStatus,
    pub message: String,
    pub progress: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialPortInfo {
    pub port_name: String,
    pub description: String,
    pub vid: u16,
    pub pid: u16,
}

pub struct AmonetExploit {
    config: AmonetConfig,
    python_path: PathBuf,
    mtkclient_dir: PathBuf,
    payloads_dir: PathBuf,
}

impl AmonetExploit {
    pub fn new(config: AmonetConfig, python_path: PathBuf, mtkclient_dir: PathBuf) -> Self {
        let payloads_dir = mtkclient_dir.join("payloads");
        Self {
            config,
            python_path,
            mtkclient_dir,
            payloads_dir,
        }
    }

    /// Scan for MTK USB serial ports via mtkclient
    pub async fn scan_ports(&self) -> Result<Vec<SerialPortInfo>> {
        let output = TokioCommand::new(&self.python_path)
            .args([
                "mtkclient",
                "scan",
                "--usb",
            ])
            .current_dir(&self.mtkclient_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .context("Failed to execute mtkclient scan")?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let mut ports = Vec::new();

        for line in stdout.lines() {
            // Parse lines like: "Port: /dev/ttyUSB0 (MediaTek USB VCOM) VID:0e8d PID:0003"
            if line.contains("VID:") || line.contains("MediaTek") || line.contains("MTK") {
                let port_name = line
                    .split_whitespace()
                    .find(|s| s.starts_with("/dev/") || s.starts_with("COM"))
                    .unwrap_or("")
                    .to_string();

                if !port_name.is_empty() {
                    ports.push(SerialPortInfo {
                        port_name,
                        description: line.trim().to_string(),
                        vid: 0x0E8D,
                        pid: 0x0003,
                    });
                }
            }
        }

        Ok(ports)
    }

    /// Execute the exploit via mtkclient subprocess
    pub async fn execute(
        &self,
        callback: Arc<Mutex<dyn FnMut(AmonetEvent) + Send>>,
        _app: AppHandle,
    ) -> Result<()> {
        CANCEL_FLAG.store(false, Ordering::SeqCst);
        AMONET_RUNNING.store(true, Ordering::SeqCst);

        let result = self.run_exploit(callback.clone()).await;

        AMONET_RUNNING.store(false, Ordering::SeqCst);
        AMONET_PID.get_or_init(|| Mutex::new(None));

        if CANCEL_FLAG.load(Ordering::SeqCst) {
            Self::emit_event(&callback, AmonetStatus::Cancelled, "Cancelled by user", None);
            anyhow::bail!("Operation cancelled");
        }

        result
    }

    async fn run_exploit(
        &self,
        callback: Arc<Mutex<dyn FnMut(AmonetEvent) + Send>>,
    ) -> Result<()> {
        Self::emit_event(
            &callback,
            AmonetStatus::Exploiting,
            &format!(
                "Starting mtkclient with {} payload...",
                self.config.payload_type.display_name()
            ),
            Some(0.1),
        );

        // Build mtkclient arguments
        let mut args = vec![
            "mtkclient".to_string(),
            "exploit".to_string(),
            "--payload".to_string(),
            self.config.payload_type.filename().to_string(),
        ];

        if let Some(ref port) = self.config.port {
            args.push("--port".to_string());
            args.push(port.clone());
        }

        args.push("--brom".to_string());

        Self::emit_event(
            &callback,
            AmonetStatus::Exploiting,
            &format!("Executing: python {} {}", self.python_path.display(), args.join(" ")),
            Some(0.2),
        );

        let mut child = TokioCommand::new(&self.python_path)
            .args(&args)
            .current_dir(&self.mtkclient_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .context("Failed to spawn mtkclient")?;

        // Store PID for cancellation
        if let Some(id) = child.id() {
            AMONET_PID.get_or_init(|| Mutex::new(None));
            if let Ok(mut pid) = AMONET_PID.get().unwrap().lock() {
                *pid = Some(id);
            }
        }

        let mut stdout = child.stdout.take().context("No stdout")?;
        let mut stderr = child.stderr.take().context("No stderr")?;
        let mut stdout_buf = vec![0u8; 4096];
        let mut stderr_buf = vec![0u8; 4096];
        let mut accumulated = String::new();

        loop {
            if CANCEL_FLAG.load(Ordering::SeqCst) {
                let _ = child.kill().await;
                Self::emit_event(
                    &callback,
                    AmonetStatus::Cancelled,
                    "Cancelling...",
                    None,
                );
                break;
            }

            let read_result = tokio::select! {
                r = stdout.read(&mut stdout_buf) => {
                    r.map(|n| (n, true))
                }
                r = stderr.read(&mut stderr_buf) => {
                    r.map(|n| (n, false))
                }
            };

            match read_result {
                Ok((0, _)) => break,
                Ok((n, is_stdout)) => {
                    let buf = if is_stdout { &stdout_buf } else { &stderr_buf };
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    accumulated.push_str(&chunk);

                    for line in accumulated.lines() {
                        let lower = line.to_lowercase();
                        let (status, progress) = if lower.contains("error") || lower.contains("failed") {
                            (AmonetStatus::Failed(line.to_string()), None)
                        } else if lower.contains("success") || lower.contains("done") || lower.contains("complete") {
                            (AmonetStatus::Success, Some(1.0))
                        } else if lower.contains("exploit") || lower.contains("sending") {
                            (AmonetStatus::Exploiting, Some(0.5))
                        } else if lower.contains("scanning") || lower.contains("found") {
                            (AmonetStatus::Scanning, Some(0.3))
                        } else if lower.contains("connecting") || lower.contains("port") {
                            (AmonetStatus::Connecting, Some(0.2))
                        } else {
                            continue;
                        };

                        Self::emit_event(&callback, status, line, progress);
                    }
                    accumulated.clear();
                }
                Err(_) => break,
            }
        }

        let status = child.wait().await.context("Failed to wait for mtkclient")?;

        if status.success() {
            Self::emit_event(
                &callback,
                AmonetStatus::Success,
                "Exploit completed successfully",
                Some(1.0),
            );
            Ok(())
        } else {
            let code = status.code().unwrap_or(-1);
            Self::emit_event(
                &callback,
                AmonetStatus::Failed(format!("Exit code: {}", code)),
                &format!("mtkclient exited with code {}", code),
                None,
            );
            anyhow::bail!("mtkclient failed with exit code: {}", code)
        }
    }

    fn emit_event(
        callback: &Arc<Mutex<dyn FnMut(AmonetEvent) + Send>>,
        status: AmonetStatus,
        msg: &str,
        progress: Option<f32>,
    ) {
        if let Ok(mut cb) = callback.lock() {
            cb(AmonetEvent {
                status,
                message: msg.to_string(),
                progress,
            });
        }
    }
}

pub fn cancel_exploit() {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    AMONET_RUNNING.store(false, Ordering::SeqCst);

    // Kill the mtkclient process
    if let Some(pid_lock) = AMONET_PID.get() {
        if let Ok(pid_guard) = pid_lock.lock() {
            if let Some(pid) = *pid_guard {
                #[cfg(target_os = "windows")]
                {
                    use std::process::Command;
                    let _ = Command::new("taskkill")
                        .args(["/F", "/PID", &pid.to_string()])
                        .output();
                }
                #[cfg(not(target_os = "windows"))]
                {
                    unsafe {
                        libc::kill(pid as i32, libc::SIGTERM);
                    }
                }
            }
        }
    }
}

pub fn is_running() -> bool {
    AMONET_RUNNING.load(Ordering::SeqCst)
}
