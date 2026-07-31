/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::commands::{emit_operation_complete, emit_operation_output, result_with_emit};
use crate::error::AppError;
use fastboot_protocol::nusb::{self as fastboot_nusb, NusbFastBoot, NusbFastBootOpenError};
use fastboot_protocol::protocol::FastBootResponse;
use nusb;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;
use tauri::AppHandle;

const SPARSE_MAGIC: u32 = 0xed26ff3a;
const FLASH_CHUNK_SIZE: usize = 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FastbootDevice {
    pub id: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
    pub serial_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FastbootRebootMode {
    Normal,
    Bootloader,
    Recovery,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FastbootSlot {
    A,
    B,
}

#[tauri::command]
pub async fn fastboot_list_devices() -> Result<Vec<FastbootDevice>, AppError> {
    let devices = fastboot_nusb::devices()
        .map_err(|err| AppError::command(format!("Failed to list fastboot devices: {err}")))?;

    let mut results = Vec::new();
    for info in devices {
        results.push(FastbootDevice {
            id: fastboot_device_id(&info),
            vendor_id: info.vendor_id(),
            product_id: info.product_id(),
            manufacturer: info.manufacturer_string().map(|value| value.to_string()),
            product: info.product_string().map(|value| value.to_string()),
            serial_number: info.serial_number().map(|value| value.to_string()),
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn fastboot_getvar_all(
    app: AppHandle,
    device_id: String,
    operation_id: String,
) -> Result<Vec<String>, AppError> {
    emit_operation_output(&app, &operation_id, "Fetching fastboot variables...", false);

    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;
    let mut fastboot = result_with_emit(open_fastboot(&info), &app, &operation_id)?;

    let vars = result_with_emit(
        fastboot
            .get_all_vars()
            .await
            .map_err(|err| AppError::command(format!("fastboot getvar all failed: {err}"))),
        &app,
        &operation_id,
    )?;

    let mut keys: Vec<_> = vars.keys().cloned().collect();
    keys.sort();

    let mut lines = Vec::new();
    for key in keys {
        if let Some(value) = vars.get(&key) {
            let line = format!("{key}: {value}");
            emit_operation_output(&app, &operation_id, &line, false);
            lines.push(line);
        }
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(lines)
}

#[tauri::command]
pub async fn fastboot_getvar(
    app: AppHandle,
    device_id: String,
    name: String,
    operation_id: String,
) -> Result<String, AppError> {
    emit_operation_output(
        &app,
        &operation_id,
        &format!("Fetching fastboot variable: {name}..."),
        false,
    );

    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;
    let mut fastboot = result_with_emit(open_fastboot(&info), &app, &operation_id)?;

    let value = result_with_emit(
        fastboot
            .get_var(&name)
            .await
            .map_err(|err| AppError::command(format!("fastboot getvar failed: {err}"))),
        &app,
        &operation_id,
    )?;

    emit_operation_output(&app, &operation_id, &format!("{name}: {value}"), false);
    emit_operation_complete(&app, &operation_id, true, None);
    Ok(value)
}

#[tauri::command]
pub async fn fastboot_flash(
    app: AppHandle,
    device_id: String,
    partition: String,
    image_path: String,
    operation_id: String,
) -> Result<(), AppError> {
    let image_path_ref = Path::new(&image_path);
    if !image_path_ref.is_file() {
        let message = format!("Image file not found: {image_path}");
        emit_operation_output(&app, &operation_id, &message, true);
        emit_operation_complete(&app, &operation_id, false, Some(message.clone()));
        return Err(AppError::command(message));
    }

    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;
    let mut fastboot = result_with_emit(open_fastboot(&info), &app, &operation_id)?;

    let metadata = result_with_emit(
        tokio::fs::metadata(image_path_ref)
            .await
            .map_err(|err| AppError::command(format!("Failed to read image metadata: {err}"))),
        &app,
        &operation_id,
    )?;
    let file_size = metadata.len();
    let size = result_with_emit(
        u32::try_from(file_size).map_err(|_| AppError::command("Image file is too large for fastboot")),
        &app,
        &operation_id,
    )?;

    if is_sparse_image(image_path_ref).await? {
        emit_operation_output(
            &app,
            &operation_id,
            "Detected sparse image; sending in sparse format.",
            false,
        );
    }

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Downloading {file_size} bytes..."),
        false,
    );

    let mut download = result_with_emit(
        fastboot
            .download(size)
            .await
            .map_err(|err| AppError::command(format!("Fastboot download failed: {err}"))),
        &app,
        &operation_id,
    )?;

    let mut file = result_with_emit(
        tokio::fs::File::open(image_path_ref)
            .await
            .map_err(|err| AppError::command(format!("Failed to open image file: {err}"))),
        &app,
        &operation_id,
    )?;
    let mut buffer = vec![0u8; FLASH_CHUNK_SIZE];
    loop {
        let bytes = result_with_emit(
            tokio::io::AsyncReadExt::read(&mut file, &mut buffer)
                .await
                .map_err(|err| AppError::command(format!("Failed to read image file: {err}"))),
            &app,
            &operation_id,
        )?;
        if bytes == 0 {
            break;
        }
        result_with_emit(
            download
                .extend_from_slice(&buffer[..bytes])
                .await
                .map_err(|err| AppError::command(format!("Fastboot download failed: {err}"))),
            &app,
            &operation_id,
        )?;
    }

    result_with_emit(
        download
            .finish()
            .await
            .map_err(|err| AppError::command(format!("Fastboot download failed: {err}"))),
        &app,
        &operation_id,
    )?;

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Flashing partition: {partition}"),
        false,
    );

    result_with_emit(
        fastboot
            .flash(&partition)
            .await
            .map_err(|err| AppError::command(format!("Fastboot flash failed: {err}"))),
        &app,
        &operation_id,
    )?;

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_erase(
    app: AppHandle,
    device_id: String,
    partition: String,
    operation_id: String,
) -> Result<(), AppError> {
    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;
    let mut fastboot = result_with_emit(open_fastboot(&info), &app, &operation_id)?;

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Erasing partition: {partition}"),
        false,
    );

    result_with_emit(
        fastboot
            .erase(&partition)
            .await
            .map_err(|err| AppError::command(format!("Fastboot erase failed: {err}"))),
        &app,
        &operation_id,
    )?;

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_reboot(
    app: AppHandle,
    device_id: String,
    mode: FastbootRebootMode,
    operation_id: String,
) -> Result<(), AppError> {
    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Rebooting to {mode:?}..."),
        false,
    );

    match mode {
        FastbootRebootMode::Normal => {
            let mut fastboot = result_with_emit(open_fastboot(&info), &app, &operation_id)?;
            result_with_emit(
                fastboot
                    .reboot()
                    .await
                    .map_err(|err| AppError::command(format!("Fastboot reboot failed: {err}"))),
                &app,
                &operation_id,
            )?;
        }
        FastbootRebootMode::Bootloader => {
            let mut fastboot = result_with_emit(open_fastboot(&info), &app, &operation_id)?;
            result_with_emit(
                fastboot
                    .reboot_bootloader()
                    .await
                    .map_err(|err| AppError::command(format!("Fastboot reboot failed: {err}"))),
                &app,
                &operation_id,
            )?;
        }
        FastbootRebootMode::Recovery => {
            let mut client = result_with_emit(open_raw_fastboot(&info), &app, &operation_id)?;
            result_with_emit(
                send_raw_command(&mut client, "reboot-recovery")
                    .await
                    .map_err(|err| AppError::command(format!("Fastboot reboot failed: {err}"))),
                &app,
                &operation_id,
            )?;
        }
    }

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_set_active_slot(
    app: AppHandle,
    device_id: String,
    slot: FastbootSlot,
    operation_id: String,
) -> Result<(), AppError> {
    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;

    let mut client = result_with_emit(open_raw_fastboot(&info), &app, &operation_id)?;

    let slot_value = match slot {
        FastbootSlot::A => "a",
        FastbootSlot::B => "b",
    };

    emit_operation_output(
        &app,
        &operation_id,
        &format!("Setting active slot to {slot_value}..."),
        false,
    );

    let command = format!("set_active:{slot_value}");
    result_with_emit(
        send_raw_command(&mut client, &command)
            .await
            .map_err(|err| AppError::command(format!("Fastboot set_active failed: {err}"))),
        &app,
        &operation_id,
    )?;

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

#[tauri::command]
pub async fn fastboot_reboot_fastbootd(
    app: AppHandle,
    device_id: String,
    operation_id: String,
) -> Result<(), AppError> {
    let info = result_with_emit(find_device_info(&device_id), &app, &operation_id)?;

    let mut client = result_with_emit(open_raw_fastboot(&info), &app, &operation_id)?;

    emit_operation_output(
        &app,
        &operation_id,
        "Rebooting to fastbootd...",
        false,
    );

    result_with_emit(
        send_raw_command(&mut client, "reboot-fastboot")
            .await
            .map_err(map_fastbootd_error),
        &app,
        &operation_id,
    )?;

    emit_operation_complete(&app, &operation_id, true, None);
    Ok(())
}

fn fastboot_device_id(info: &nusb::DeviceInfo) -> String {
    format!("{:?}", info.id())
}

fn find_device_info(device_identifier: &str) -> Result<nusb::DeviceInfo, AppError> {
    let devices = fastboot_nusb::devices()
        .map_err(|err| AppError::command(format!("Failed to list fastboot devices: {err}")))?;
    for info in devices {
        if fastboot_device_id(&info) == device_identifier {
            return Ok(info);
        }
    }
    Err(AppError::command("Fastboot device not found"))
}

fn open_fastboot(info: &nusb::DeviceInfo) -> Result<NusbFastBoot, AppError> {
    NusbFastBoot::from_info(info).map_err(map_open_error)
}

fn map_open_error(err: NusbFastBootOpenError) -> AppError {
    AppError::command(format!("Failed to open fastboot device: {err}"))
}

async fn is_sparse_image(path: &Path) -> Result<bool, AppError> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|err| AppError::command(format!("Failed to open image file: {err}")))?;
    let mut header = [0u8; 4];
    let bytes = tokio::io::AsyncReadExt::read(&mut file, &mut header)
        .await
        .map_err(|err| AppError::command(format!("Failed to read image file: {err}")))?;
    if bytes < 4 {
        return Ok(false);
    }
    Ok(u32::from_le_bytes(header) == SPARSE_MAGIC)
}

struct RawFastbootClient {
    interface: nusb::Interface,
    ep_out: u8,
    ep_in: u8,
    max_in: usize,
}

fn open_raw_fastboot(info: &nusb::DeviceInfo) -> Result<RawFastbootClient, AppError> {
    let interface_number = NusbFastBoot::find_fastboot_interface(info)
        .ok_or_else(|| AppError::command("Failed to find fastboot interface"))?;
    let device = info
        .open()
        .map_err(|err| AppError::command(format!("Failed to open device: {err}")))?;
    let interface = device
        .claim_interface(interface_number)
        .map_err(|err| AppError::command(format!("Failed to claim interface: {err}")))?;

    let mut ep_out = None;
    let mut ep_in = None;
    for alt in interface.descriptors() {
        let out = alt.endpoints().find_map(|end| {
            if end.transfer_type() == nusb::transfer::EndpointType::Bulk
                && end.direction() == nusb::transfer::Direction::Out
            {
                Some((end.address(), end.max_packet_size()))
            } else {
                None
            }
        });
        let inn = alt.endpoints().find_map(|end| {
            if end.transfer_type() == nusb::transfer::EndpointType::Bulk
                && end.direction() == nusb::transfer::Direction::In
            {
                Some((end.address(), end.max_packet_size()))
            } else {
                None
            }
        });
        if let (Some(out), Some(inn)) = (out, inn) {
            ep_out = Some(out);
            ep_in = Some(inn);
            break;
        }
    }

    let (ep_out, _max_out) = ep_out.ok_or_else(|| {
        AppError::command("Failed to find fastboot bulk OUT endpoint")
    })?;
    let (ep_in, max_in) =
        ep_in.ok_or_else(|| AppError::command("Failed to find fastboot bulk IN endpoint"))?;

    Ok(RawFastbootClient {
        interface,
        ep_out,
        ep_in,
        max_in,
    })
}

async fn send_raw_command(client: &mut RawFastbootClient, command: &str) -> Result<(), String> {
    let mut out = vec![];
    out.write_fmt(format_args!("{command}"))
        .map_err(|err| err.to_string())?;

    client
        .interface
        .bulk_out(client.ep_out, out)
        .await
        .status
        .map_err(|err| err.to_string())?;

    loop {
        let req = nusb::transfer::RequestBuffer::new(client.max_in);
        let resp = client.interface.bulk_in(client.ep_in, req).await;
        resp.status.map_err(|err| err.to_string())?;
        match FastBootResponse::from_bytes(&resp.data) {
            Ok(FastBootResponse::Okay(_)) => return Ok(()),
            Ok(FastBootResponse::Fail(fail)) => return Err(fail),
            Ok(FastBootResponse::Info(_)) | Ok(FastBootResponse::Text(_)) => continue,
            Ok(FastBootResponse::Data(_)) => return Err("Unexpected DATA response".to_string()),
            Err(err) => return Err(err.to_string()),
        }
    }
}

fn map_fastbootd_error(err: String) -> AppError {
    let lower = err.to_lowercase();
    if lower.contains("unknown command")
        || lower.contains("not supported")
        || lower.contains("unsupported")
        || lower.contains("invalid command")
    {
        return AppError::command("Fastbootd reboot is not supported on this device");
    }
    AppError::command(format!("Fastboot reboot failed: {err}"))
}
