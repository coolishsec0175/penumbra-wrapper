/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::amonet::{
    cancel_exploit, AmonetConfig, AmonetEvent, AmonetExploit, AmonetStatus, PayloadType,
    SerialPortInfo,
};
use std::sync::{Arc, Mutex};

#[tauri::command]
pub async fn amonet_scan_ports() -> Result<Vec<SerialPortInfo>, AppError> {
    AmonetExploit::scan_ports().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn amonet_execute(
    payload_type: String,
    port: Option<String>,
    baud_rate: Option<u32>,
    timeout_ms: Option<u64>,
    custom_payload_path: Option<String>,
) -> Result<String, AppError> {
    let payload = match payload_type.as_str() {
        "brom_defuse" => PayloadType::BromDefuse,
        "extloader_v5" => PayloadType::ExtloaderV5,
        "extloader_v6_arm" => PayloadType::ExtloaderV6Arm,
        "extloader_v6_arm64" => PayloadType::ExtloaderV6Arm64,
        "hakujoudai_arm" => PayloadType::HakujoudaiArm,
        "hakujoudai_arm64" => PayloadType::HakujoudaiArm64,
        "sla_xml_arm" => PayloadType::SlaXmlArm,
        "sla_xml_arm64" => PayloadType::SlaXmlArm64,
        _ => PayloadType::BromDefuse,
    };

    let config = AmonetConfig {
        payload_type: payload,
        port,
        baud_rate: baud_rate.unwrap_or(115200),
        custom_payload_path,
        timeout_ms: timeout_ms.unwrap_or(30000),
    };

    let amonet = AmonetExploit::new(config);

    let events = Arc::new(Mutex::new(Vec::<AmonetEvent>::new()));
    let events_clone = events.clone();

    let callback = Arc::new(Mutex::new(move |event: AmonetEvent| {
        log::info!("Amonet: {:?} - {}", event.status, event.message);
        if let Ok(mut evts) = events_clone.lock() {
            evts.push(event);
        }
    }));

    match amonet.execute(callback).await {
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
