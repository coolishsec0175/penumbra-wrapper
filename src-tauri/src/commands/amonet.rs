/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::amonet::{
    cancel_exploit, AmonetConfig, AmonetEvent, AmonetExploit, AmonetStatus, PayloadType,
    SerialPortInfo,
};
use crate::services::config::ConfigService;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

#[tauri::command]
pub async fn amonet_scan_ports(app: AppHandle) -> Result<Vec<SerialPortInfo>, AppError> {
    let config = ConfigService::get(&app).map_err(|e| AppError::command(e.to_string()))?;
    let amonet = AmonetExploit::new(
        AmonetConfig::default(),
        config.settings.mtkclient_python_path.clone().into(),
        config.settings.mtkclient_path.clone().into(),
    );
    amonet
        .scan_ports()
        .await
        .map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn amonet_execute(
    app: AppHandle,
    payload_type: String,
    port: Option<String>,
    baud_rate: Option<u32>,
    timeout_ms: Option<u64>,
    custom_payload_path: Option<String>,
) -> Result<String, AppError> {
    let config = ConfigService::get(&app).map_err(|e| AppError::command(e.to_string()))?;

    let payload = match payload_type.as_str() {
        "brom_defuse" => PayloadType::BromDefuse,
        "extloader_v5" => PayloadType::ExtloaderV5,
        "extloader_v6_arm" => PayloadType::ExtloaderV6Arm,
        "extloader_v6_arm64" => PayloadType::ExtloaderV6Arm64,
        "hakujoudai_arm" => PayloadType::HakujoudaiArm,
        "hakujoudai_arm64" => PayloadType::HakujoudaiArm64,
        "sla_xml_arm" => PayloadType::SlaXmlArm,
        "sla_xml_arm64" => PayloadType::SlaXmlArm64,
        "da_x" => PayloadType::DaX,
        "da_xml_arm" => PayloadType::DaXmlArm,
        "da_xml_arm64" => PayloadType::DaXmlArm64,
        _ => PayloadType::BromDefuse,
    };

    let amonet_config = AmonetConfig {
        payload_type: payload,
        port,
        baud_rate: baud_rate.unwrap_or(115200),
        custom_payload_path,
        timeout_ms: timeout_ms.unwrap_or(30000),
    };

    let amonet = AmonetExploit::new(
        amonet_config,
        config.settings.mtkclient_python_path.clone().into(),
        config.settings.mtkclient_path.clone().into(),
    );

    let events = Arc::new(Mutex::new(Vec::<AmonetEvent>::new()));
    let events_clone = events.clone();

    let callback = Arc::new(Mutex::new(move |event: AmonetEvent| {
        log::info!("Amonet: {:?} - {}", event.status, event.message);
        if let Ok(mut evts) = events_clone.lock() {
            evts.push(event);
        }
    }));

    match amonet.execute(callback, app).await {
        Ok(()) => Ok("Exploit completed successfully".to_string()),
        Err(e) => {
            let error_msg = e.to_string();
            if error_msg.contains("cancelled") {
                Err(AppError::Cancelled)
            } else {
                Err(AppError::command(error_msg))
            }
        }
    }
}

#[tauri::command]
pub async fn amonet_cancel() -> Result<(), AppError> {
    cancel_exploit();
    Ok(())
}
