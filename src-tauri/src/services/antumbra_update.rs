use crate::services::antumbra::{get_antumbra_updatable_path, get_existing_antumbra_path};
use crate::services::antumbra_download::{
    compute_file_checksum, download_file_with_retry_and_progress, emit_progress,
};
use crate::services::config::{load_settings, save_settings};
use anyhow::{Context, Result};
use log::warn;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[cfg(windows)]
use std::time::Duration;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntumbraUpdateInfo {
    pub installed_version: Option<String>,
    pub installed_path: Option<String>,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub supported: bool,
    pub asset_name: Option<String>,
    pub asset_url: Option<String>,
    pub checksum: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AntumbraUpdateResult {
    pub version: String,
    pub path: String,
}

#[derive(Debug, Deserialize, Clone)]
struct ReleaseAsset {
    name: String,
    browser_download_url: String,
    digest: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ReleaseInfo {
    tag_name: String,
    assets: Vec<ReleaseAsset>,
}

pub async fn check_for_updates(app: &AppHandle) -> Result<AntumbraUpdateInfo> {
    let installed_path = get_existing_antumbra_path(app)?;

    let installed_version = match load_settings() {
        Ok(settings) => settings.antumbra_version,
        Err(_) => None,
    };

    let installed_version = if installed_version.is_none() && installed_path.is_some() {
        match get_installed_version(app) {
            Ok(version) => {
                if let Ok(mut settings) = load_settings() {
                    settings.antumbra_version = Some(version.clone());
                    let _ = save_settings(&settings);
                }
                Some(version)
            }
            Err(_) => None,
        }
    } else {
        installed_version
    };

    let installed_checksum = match &installed_path {
        Some(path) => compute_file_checksum(path).ok(),
        None => None,
    };

    let nightly = fetch_nightly_release().await;

    match nightly {
        Ok(release) => {
            let (asset_name, asset_url, checksum) = match find_asset_with_digest(&release) {
                Ok(info) => info,
                Err(err) => {
                    return Ok(AntumbraUpdateInfo {
                        installed_version,
                        installed_path: installed_path
                            .as_ref()
                            .map(|path| path.display().to_string()),
                        latest_version: Some(release.tag_name),
                        update_available: false,
                        supported: false,
                        asset_name: None,
                        asset_url: None,
                        checksum: None,
                        message: Some(err.to_string()),
                    });
                }
            };

            let latest_version = normalize_version(&release.tag_name);
            let update_available = match (&installed_path, &installed_version, &latest_version) {
                (None, _, _) => true,
                (Some(_), None, Some(latest)) => {
                    if let Ok(detected_version) = get_installed_version(app) {
                        normalize_version(&detected_version).as_deref() != Some(latest)
                    } else {
                        log::warn!("Binary exists but version detection failed, assuming update needed");
                        true
                    }
                }
                (Some(_), Some(installed), Some(latest)) => {
                    if let (Some(installed_checksum), Some(expected_checksum)) =
                        (installed_checksum.as_deref(), Some(checksum.as_str()))
                    {
                        installed_checksum != expected_checksum
                    } else if normalize_version(installed).as_deref() != Some(latest) {
                        true
                    } else {
                        false
                    }
                }
                (Some(_), Some(installed), None) => {
                    installed.trim() != release.tag_name.trim()
                }
                (Some(_), _, _) => {
                    log::warn!("Version comparison failed, assuming update needed for safety");
                    true
                }
            };

            Ok(AntumbraUpdateInfo {
                installed_version,
                installed_path: installed_path.as_ref().map(|path| path.display().to_string()),
                latest_version: latest_version.or(Some(release.tag_name)),
                update_available,
                supported: true,
                asset_name: Some(asset_name),
                asset_url: Some(asset_url),
                checksum: Some(checksum),
                message: None,
            })
        }
        Err(err) => Ok(AntumbraUpdateInfo {
            installed_version,
            installed_path: installed_path.as_ref().map(|path| path.display().to_string()),
            latest_version: None,
            update_available: false,
            supported: false,
            asset_name: None,
            asset_url: None,
            checksum: None,
            message: Some(err.to_string()),
        }),
    }
}

pub async fn download_and_install(app: &AppHandle) -> Result<AntumbraUpdateResult> {
    download_and_install_with_progress(app).await
}

pub async fn download_and_install_with_progress(app: &AppHandle) -> Result<AntumbraUpdateResult> {
    emit_progress(app, "fetching", 0, 0, 1, 3, "Fetching release information...");
    let release = fetch_nightly_release().await?;
    let (_asset_name, asset_url, checksum) = find_asset_with_digest(&release)?;

    let target_path = get_antumbra_updatable_path(app)?;
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).context("Failed to create antumbra bin directory")?;
    }

    let temp_path = target_path.with_extension("download");
    download_file_with_retry_and_progress(app, &asset_url, &temp_path, &checksum).await?;

    emit_progress(app, "replacing", 0, 0, 1, 3, "Replacing binary...");
    safe_replace_binary(&target_path, &temp_path).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&target_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&target_path, perms)?;
    }

    if let Ok(mut settings) = load_settings() {
        settings.antumbra_version = Some(release.tag_name.clone());
        if let Err(e) = save_settings(&settings) {
            warn!("Failed to save antumbra version to config: {}", e);
        }
    }

    emit_progress(app, "completed", 0, 0, 1, 3, "Update completed successfully!");
    Ok(AntumbraUpdateResult { version: release.tag_name, path: target_path.display().to_string() })
}

async fn safe_replace_binary(target_path: &Path, temp_path: &Path) -> Result<()> {
    log::info!("Starting safe binary replacement: {:?} -> {:?}", temp_path, target_path);

    #[cfg(windows)]
    {
        replace_binary_with_retry(temp_path, target_path).await?;
    }
    #[cfg(not(windows))]
    {
        fs::rename(temp_path, target_path)
            .context("Failed to replace antumbra binary")?;
    }

    log::info!("Successfully replaced antumbra binary");
    Ok(())
}

#[cfg(windows)]
async fn replace_binary_with_retry(temp_path: &Path, target_path: &Path) -> Result<()> {
    for attempt in 0..5 {
        match fs::rename(temp_path, target_path) {
            Ok(_) => return Ok(()),
            Err(e) => {
                if let Some(raw_error) = e.raw_os_error() {
                    if raw_error == 32 && attempt < 4 {
                        log::warn!("File locked (attempt {}/5), retrying in 2 seconds...", attempt + 1);
                        if let Err(kill_err) = crate::services::antumbra::kill_current_process() {
                            log::warn!("Failed to kill antumbra process: {}", kill_err);
                        }
                        tokio::time::sleep(Duration::from_secs(2)).await;
                        continue;
                    } else if raw_error == 5 {
                        return Err(anyhow::anyhow!("Access denied when replacing antumbra binary. Please run as Administrator or check antivirus software."));
                    }
                }

                log::error!("Failed to replace binary (attempt {}/5): {}", attempt + 1, e);

                if attempt < 4 {
                    tokio::time::sleep(Duration::from_millis(1000)).await;
                    continue;
                }
                return Err(anyhow::anyhow!("Failed to replace antumbra binary after 5 attempts: {}. Is antumbra.exe currently running?", e));
            }
        }
    }
    Err(anyhow::anyhow!("Unexpected error in replace_binary_with_retry"))
}

async fn fetch_nightly_release() -> Result<ReleaseInfo> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/ardiandideyashidiq/penumbra/releases/tags/nightly")
        .header("User-Agent", "penumbra-wrapper")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .context("Failed to fetch nightly release")?;

    let release = response
        .error_for_status()
        .context("GitHub API returned an error status")?
        .json::<ReleaseInfo>()
        .await
        .context("Failed to parse release JSON")?;

    Ok(release)
}

fn find_asset_with_digest(release: &ReleaseInfo) -> Result<(String, String, String)> {
    let asset_name = select_asset_name()?;
    let asset = release
        .assets
        .iter()
        .find(|a| a.name == asset_name)
        .cloned()
        .context("Matching antumbra release asset not found")?;

    let digest = asset
        .digest
        .clone()
        .context("Release asset has no digest field")?;

    let checksum = digest
        .strip_prefix("sha256:")
        .map(|s| s.to_string())
        .ok_or_else(|| anyhow::anyhow!("Digest is not in sha256: format"))?;

    log::info!("Found checksum for {} via API digest: {}", asset_name, checksum);

    Ok((asset.name, asset.browser_download_url, checksum))
}

fn select_asset_name() -> Result<String> {
    if cfg!(target_os = "linux") && cfg!(target_arch = "x86_64") {
        Ok("antumbra-x86_64-linux".to_string())
    } else if cfg!(target_os = "windows") && cfg!(target_arch = "x86_64") {
        Ok("antumbra-x86_64-windows.exe".to_string())
    } else if cfg!(target_os = "macos") {
        anyhow::bail!("Antumbra updates are not available for macOS yet")
    } else {
        anyhow::bail!("Antumbra updates are not available for this platform")
    }
}

pub fn get_installed_version(app: &AppHandle) -> Result<String> {
    if let Some(path) = get_existing_antumbra_path(app)? {
        log::info!("Getting version from antumbra binary at: {:?}", path);

        let output = std::process::Command::new(path)
            .arg("--version")
            .output()
            .context("Failed to execute antumbra for version check")?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            anyhow::bail!("Antumbra returned an empty version string")
        }

        log::info!("Detected antumbra version: {}", stdout);

        if let Err(sync_err) = crate::services::antumbra::sync_detected_version_to_config(app, &stdout) {
            log::warn!("Failed to sync detected version to config: {}", sync_err);
        }

        return Ok(stdout);
    }

    anyhow::bail!("Antumbra binary not found")
}

fn normalize_version(version: &str) -> Option<String> {
    let token = version.split_whitespace().find(|part| part.chars().any(|c| c.is_ascii_digit()))?;
    Some(token.trim_start_matches('v').to_string())
}
