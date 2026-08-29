/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::services::amonet::{
    cancel_exploit, AmonetConfig, AmonetEvent, AmonetExploit, AmonetStatus, ExploitType,
    SerialPortInfo,
};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn amonet_scan_ports() -> Result<Vec<SerialPortInfo>, AppError> {
    AmonetExploit::scan_ports().map_err(|e| AppError::command(e.to_string()))
}

#[tauri::command]
pub async fn amonet_execute(
    exploit_type: String,
    port: Option<String>,
    baud_rate: Option<u32>,
    timeout_ms: Option<u64>,
) -> Result<String, AppError> {
    let exploit = match exploit_type.as_str() {
        "kamakiri_v1" => ExploitType::KamakiriV1,
        "kamakiri_v2" => ExploitType::KamakiriV2,
        "amonet" => ExploitType::Amonet,
        "bruteforce" => ExploitType::Bruteforce,
        _ => ExploitType::KamakiriV2,
    };

    let config = AmonetConfig {
        exploit_type: exploit,
        port,
        baud_rate: baud_rate.unwrap_or(115200),
        payload_path: None,
        timeout_ms: timeout_ms.unwrap_or(30000),
    };

    let amonet = AmonetExploit::new(config);

    // Create callback to collect events
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
