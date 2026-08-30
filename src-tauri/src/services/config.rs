/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default)]
    pub da_path: Option<String>,
    #[serde(default)]
    pub preloader_path: Option<String>,
    #[serde(default)]
    pub auth_path: Option<String>,
    #[serde(default)]
    pub usb_log: bool,
    #[serde(default)]
    pub verbose: bool,
    #[serde(default)]
    pub default_output_path: Option<String>,
    #[serde(default)]
    pub auto_check_updates: bool,
    #[serde(default)]
    pub penumbra_version: Option<String>,
    #[serde(default)]
    pub backup_skip_partitions: Vec<String>,
    #[serde(default)]
    pub mtkclient_python_path: Option<String>,
    #[serde(default)]
    pub mtkclient_path: Option<String>,
    #[serde(default)]
    pub mtkclient_iot_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            da_path: None,
            preloader_path: None,
            auth_path: None,
            usb_log: false,
            verbose: false,
            default_output_path: None,
            auto_check_updates: true,
            penumbra_version: None,
            backup_skip_partitions: Vec::new(),
            mtkclient_python_path: None,
            mtkclient_path: None,
            mtkclient_iot_mode: false,
        }
    }
}

pub fn load_settings() -> Result<AppSettings> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(AppSettings::default());
    }

    let contents = std::fs::read_to_string(&config_path)?;
    let settings: AppSettings = serde_json::from_str(&contents)?;
    Ok(settings)
}

pub fn save_settings(settings: &AppSettings) -> Result<()> {
    let config_path = get_config_path()?;

    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let contents = serde_json::to_string_pretty(settings)?;
    std::fs::write(&config_path, contents)?;
    Ok(())
}

pub fn get_config_path() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not determine config directory"))?;

    Ok(config_dir.join("penumbra-wrapper").join("config.json"))
}


