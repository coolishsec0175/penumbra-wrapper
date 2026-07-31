use anyhow::{Context, Result};
use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write as StdWrite;
use std::path::Path;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tauri::Emitter;
use tokio::fs::File;
use tokio::io::{AsyncWriteExt, BufWriter};

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub status: String,
    pub attempt: u32,
    pub max_attempts: u32,
    pub message: String,
}

impl DownloadProgress {
    pub fn emit(&self, app: &AppHandle) {
        let _ = app.emit("antumbra-download-progress", self);
    }
}

pub fn emit_progress(app: &AppHandle, status: &str, bytes: u64, total: u64, attempt: u32, max: u32, message: &str) {
    let percentage = if total > 0 {
        (bytes as f32 / total as f32) * 100.0
    } else {
        0.0
    };

    DownloadProgress {
        bytes_downloaded: bytes,
        total_bytes: total,
        percentage,
        status: status.to_string(),
        attempt,
        max_attempts: max,
        message: message.to_string(),
    }.emit(app);
}

fn emit_retry_message(app: &AppHandle, attempt: u32, max: u32, delay_ms: u64, reason: &str) {
    emit_progress(
        app,
        "retrying",
        0,
        0,
        attempt,
        max,
        &format!("{}. Retrying in {}s...", reason, delay_ms / 1000),
    );
}

pub fn compute_file_checksum(path: &Path) -> Result<String> {
    let data = fs::read(path).context("Failed to read antumbra binary for checksum")?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let digest = hasher.finalize();
    Ok(hex::encode(digest))
}

pub fn verify_file_checksum(path: &Path, expected: &str) -> Result<bool> {
    let actual = compute_file_checksum(path)?;
    let matches = actual.to_lowercase() == expected.trim().to_lowercase();

    if !matches {
        log::error!("Checksum mismatch: expected {}, got {}", expected, actual);
    }

    Ok(matches)
}

fn cleanup_temp_file(temp_path: &Path) {
    if temp_path.exists() {
        if let Err(e) = fs::remove_file(temp_path) {
            log::warn!("Failed to remove temp file {:?}: {}", temp_path, e);
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum DownloadMethod {
    AsyncStreaming,
    Blocking,
    #[cfg(unix)]
    Curl,
    #[cfg(windows)]
    PowerShell,
}

fn build_download_methods(attempt: u32, max: u32) -> Vec<DownloadMethod> {
    if attempt < max {
        return vec![DownloadMethod::AsyncStreaming];
    }

    let mut methods = vec![DownloadMethod::AsyncStreaming, DownloadMethod::Blocking];

    #[cfg(unix)]
    methods.push(DownloadMethod::Curl);
    #[cfg(windows)]
    methods.push(DownloadMethod::PowerShell);

    methods
}

async fn try_download_method(
    app: &AppHandle,
    method: DownloadMethod,
    url: &str,
    temp_path: &Path,
    attempt: u32,
    max_attempts: u32,
) -> Result<u64> {
    match method {
        DownloadMethod::AsyncStreaming => {
            emit_progress(
                app,
                "downloading",
                0,
                0,
                attempt,
                max_attempts,
                &format!("Download attempt {}/{}...", attempt, max_attempts),
            );
            try_download_async_streaming(app, url, temp_path).await
        }
        DownloadMethod::Blocking => {
            emit_progress(
                app,
                "fallback_blocking",
                0,
                0,
                attempt,
                max_attempts,
                "Trying alternative download method...",
            );
            try_download_blocking(url, temp_path)?;
            Ok(0)
        }
        #[cfg(unix)]
        DownloadMethod::Curl => {
            emit_progress(
                app,
                "fallback_curl",
                0,
                0,
                attempt,
                max_attempts,
                "Trying system download...",
            );
            try_download_curl(url, temp_path)?;
            Ok(0)
        }
        #[cfg(windows)]
        DownloadMethod::PowerShell => {
            emit_progress(
                app,
                "fallback_powershell",
                0,
                0,
                attempt,
                max_attempts,
                "Trying system download...",
            );
            try_download_powershell(url, temp_path)?;
            Ok(0)
        }
    }
}

pub async fn download_file_with_retry_and_progress(
    app: &AppHandle,
    url: &str,
    temp_path: &Path,
    expected_checksum: &str,
) -> Result<()> {
    const MAX_RETRIES: u32 = 3;

    'attempts: for attempt in 1..=MAX_RETRIES {
        if temp_path.exists() {
            let _ = fs::remove_file(temp_path);
        }

        let methods = build_download_methods(attempt, MAX_RETRIES);

        for method in methods {
            let result = try_download_method(app, method, url, temp_path, attempt, MAX_RETRIES).await;
            match result {
                Ok(total_bytes) => {
                    emit_progress(
                        app,
                        "verifying",
                        total_bytes,
                        total_bytes,
                        attempt,
                        MAX_RETRIES,
                        "Verifying download checksum...",
                    );

                    if verify_file_checksum(temp_path, expected_checksum)? {
                        emit_progress(
                            app,
                            "completed",
                            total_bytes,
                            total_bytes,
                            attempt,
                            MAX_RETRIES,
                            "Download successful and verified!",
                        );
                        return Ok(());
                    }

                    log::warn!("Checksum mismatch on attempt {}", attempt);
                    cleanup_temp_file(temp_path);

                    if attempt < MAX_RETRIES {
                        let delay = attempt as u64 * 1000;
                        emit_retry_message(app, attempt, MAX_RETRIES, delay, "Checksum mismatch");
                        tokio::time::sleep(Duration::from_millis(delay)).await;
                        continue 'attempts;
                    }

                    return Err(anyhow::anyhow!(
                        "Checksum mismatch after {} attempts",
                        attempt
                    ));
                }
                Err(err) => {
                    log::error!("Download method failed on attempt {}: {}", attempt, err);
                    cleanup_temp_file(temp_path);
                }
            }
        }

        if attempt < MAX_RETRIES {
            let delay = attempt as u64 * 2000;
            emit_retry_message(app, attempt, MAX_RETRIES, delay, "Download failed");
            tokio::time::sleep(Duration::from_millis(delay)).await;
        }
    }

    Err(anyhow::anyhow!(
        "Failed to download after {} attempts and all fallbacks",
        MAX_RETRIES
    ))
}

async fn try_download_async_streaming(app: &AppHandle, url: &str, temp_path: &Path) -> Result<u64> {
    let client = reqwest::Client::builder()
        .read_timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .context("Failed to create HTTP client")?;

    log::info!("Starting async download from: {}", url);

    let response = client
        .get(url)
        .header("User-Agent", "penumbra-wrapper/1.0")
        .header("Accept", "application/octet-stream")
        .send()
        .await
        .context("Failed to send download request")?;

    let status = response.status();
    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP error {}: {}", status, status.canonical_reason().unwrap_or("Unknown")));
    }

    let total_bytes = response.content_length().unwrap_or(0);
    log::info!("Content-Length: {} bytes ({:.2} MB)", total_bytes, total_bytes as f64 / 1_048_576.0);

    let file = File::create(temp_path)
        .await
        .context("Failed to create temp file")?;
    let mut writer = BufWriter::with_capacity(64 * 1024, file);

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_progress_emit = Instant::now();

    loop {
        match tokio::time::timeout(Duration::from_secs(30), stream.next()).await {
            Ok(Some(Ok(chunk))) => {
                writer.write_all(&chunk).await.context("Failed to write chunk")?;
                downloaded += chunk.len() as u64;

                let now = Instant::now();
                if now.duration_since(last_progress_emit).as_millis() > 100
                    || downloaded % 262_144 == 0
                {
                    let percentage = if total_bytes > 0 {
                        (downloaded as f32 / total_bytes as f32) * 100.0
                    } else {
                        0.0
                    };

                    emit_progress(app, "downloading", downloaded, total_bytes, 1, 3,
                        &format!("Downloading... {:.1}%", percentage));
                    last_progress_emit = now;
                }
            }
            Ok(Some(Err(e))) => {
                return Err(anyhow::anyhow!("Stream error: {}", e));
            }
            Ok(None) => {
                log::info!("Download stream completed");
                break;
            }
            Err(_) => {
                return Err(anyhow::anyhow!("Download stalled - no data received for 30 seconds"));
            }
        }
    }

    writer.flush().await.context("Failed to flush file")?;
    drop(writer);

    log::info!("Downloaded {} bytes successfully", downloaded);
    Ok(downloaded)
}

fn try_download_blocking(url: &str, temp_path: &Path) -> Result<()> {
    log::info!("Using blocking reqwest for download");

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(60))
        .connect_timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()?;

    let mut response = client
        .get(url)
        .header("User-Agent", "penumbra-wrapper/1.0")
        .header("Accept", "application/octet-stream")
        .send()?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!("HTTP error: {}", response.status()));
    }

    let file = std::fs::File::create(temp_path)?;
    let mut writer = std::io::BufWriter::with_capacity(64 * 1024, file);

    std::io::copy(&mut response, &mut writer)?;
    writer.flush()?;

    log::info!("Blocking download completed");
    Ok(())
}

#[cfg(windows)]
fn try_download_powershell(url: &str, temp_path: &Path) -> Result<()> {
    log::info!("Using PowerShell for download");

    let output = std::process::Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &format!(
                "Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing",
                url,
                temp_path.display()
            ),
        ])
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("PowerShell download failed: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[cfg(unix)]
fn try_download_curl(url: &str, temp_path: &Path) -> Result<()> {
    log::info!("Using curl for download");

    let output = std::process::Command::new("curl")
        .args(&[
            "-L",
            "-o", temp_path.to_str().unwrap(),
            "--max-time", "60",
            "--retry", "2",
            url,
        ])
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("curl download failed: {}", String::from_utf8_lossy(&output.stderr)))
    }
}
