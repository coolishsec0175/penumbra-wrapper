use std::sync::Mutex;

use log::info;
use penumbra::connection::port::KNOWN_PORTS;
use penumbra::core::storage::{Partition, PartitionKind, RpmbRegion};
use penumbra::da::protocol::BootMode;
use penumbra::device::{Device, DeviceBuilder};
use penumbra::{find_mtk_port};
use serde::Serialize;
use tauri::{AppHandle, State};

use crate::error::AppError;

pub struct MtkState {
    pub device: Mutex<Option<Device>>,
}

impl MtkState {
    pub fn new() -> Self {
        Self { device: Mutex::new(None) }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MtkPortInfo {
    pub port_name: String,
    pub connection_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfoResult {
    pub soc_id: String,
    pub meid: String,
    pub hw_code: u16,
    pub hw_code_name: String,
    pub target_config: u32,
    pub sbc: bool,
    pub sla: bool,
    pub daa: bool,
    pub partitions: Vec<PartitionInfo>,
    pub chip_name: String,
    pub bootctrl: Option<BootCtrlInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionInfo {
    pub name: String,
    pub address: u64,
    pub size: usize,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootCtrlInfo {
    pub suffix: String,
    pub bctrl_part: String,
}

fn map_partition(p: &Partition) -> PartitionInfo {
    PartitionInfo {
        name: p.name.clone(),
        address: p.address,
        size: p.size,
        kind: format!("{:?}", p.kind),
    }
}

fn map_bootctrl(bc: &penumbra::core::bootctrl::BootControl) -> BootCtrlInfo {
    BootCtrlInfo {
        suffix: std::str::from_utf8(&bc.suffix).unwrap_or("?").trim_end_matches('\0').to_string(),
        bctrl_part: bc.bctrl_part.clone(),
    }
}

fn lock_device(state: &MtkState) -> Result<std::sync::MutexGuard<'_, Option<Device>>, AppError> {
    state.device.lock().map_err(|e| AppError::command(format!("Lock error: {e}")))
}

fn with_device<F, R>(state: &MtkState, f: F) -> Result<R, AppError>
where
    F: FnOnce(&mut Device) -> Result<R, AppError>,
{
    let mut guard = lock_device(state)?;
    let device = guard.as_mut().ok_or_else(|| AppError::command("No MTK device connected"))?;
    f(device)
}

#[tauri::command]
pub async fn mtk_list_known_ports() -> Vec<(u16, u16, String)> {
    KNOWN_PORTS
        .iter()
        .map(|(vid, pid, ct)| (*vid, *pid, format!("{ct:?}")))
        .collect()
}

#[tauri::command]
pub async fn mtk_find_port() -> Result<MtkPortInfo, AppError> {
    let port = find_mtk_port().ok_or_else(|| AppError::command("No MTK device found"))?;
    Ok(MtkPortInfo {
        port_name: port.get_port_name(),
        connection_type: format!("{:?}", port.get_connection_type()),
    })
}

#[tauri::command]
pub async fn mtk_connect(
    _app: AppHandle,
    state: State<'_, MtkState>,
    da_path: Option<String>,
) -> Result<DeviceInfoResult, AppError> {
    let mtk_port = find_mtk_port().ok_or_else(|| AppError::command("No MTK device found"))?;
    info!("Found MTK port: {}", mtk_port.get_port_name());

    let mut builder = DeviceBuilder::default().with_mtk_port(mtk_port);

    if let Some(path) = da_path {
        let da_data = std::fs::read(&path)
            .map_err(|e| AppError::command(format!("Failed to read DA file '{path}': {e}")))?;
        builder = builder.with_da_data(da_data);
    }

    let mut device = builder.build().map_err(|e| AppError::command(e.to_string()))?;
    device.init().map_err(|e| AppError::command(format!("Init failed: {e}")))?;

    let dev_info = device.dev_info.get_data();
    let tc = dev_info.target_config;

    let result = DeviceInfoResult {
        soc_id: hex::encode(dev_info.soc_id),
        meid: hex::encode(dev_info.meid),
        hw_code: dev_info.hw_code,
        hw_code_name: device.chip().name().to_string(),
        target_config: tc,
        sbc: (tc & 0x1) != 0,
        sla: (tc & 0x2) != 0,
        daa: (tc & 0x4) != 0,
        partitions: dev_info.partitions.iter().map(map_partition).collect(),
        chip_name: device.chip().name().to_string(),
        bootctrl: dev_info.bootctrl.as_ref().map(map_bootctrl),
    };

    let mut guard = lock_device(&state)?;
    *guard = Some(device);

    Ok(result)
}

#[tauri::command]
pub async fn mtk_disconnect(state: State<'_, MtkState>) -> Result<(), AppError> {
    let mut guard = lock_device(&state)?;
    *guard = None;
    Ok(())
}

#[tauri::command]
pub async fn mtk_enter_da_mode(state: State<'_, MtkState>) -> Result<(), AppError> {
    with_device(&state, |device| {
        device.enter_da_mode().map_err(|e| AppError::command(format!("Enter DA mode failed: {e}")))?;
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_get_partitions(state: State<'_, MtkState>) -> Result<Vec<PartitionInfo>, AppError> {
    with_device(&state, |device| {
        let parts = device.get_partitions();
        Ok(parts.iter().map(map_partition).collect())
    })
}

#[tauri::command]
pub async fn mtk_get_device_info(state: State<'_, MtkState>) -> Result<DeviceInfoResult, AppError> {
    with_device(&state, |device| {
        let dev_info = device.dev_info.get_data();
        let tc = dev_info.target_config;
        Ok(DeviceInfoResult {
            soc_id: hex::encode(dev_info.soc_id),
            meid: hex::encode(dev_info.meid),
            hw_code: dev_info.hw_code,
            hw_code_name: device.chip().name().to_string(),
            target_config: tc,
            sbc: (tc & 0x1) != 0,
            sla: (tc & 0x2) != 0,
            daa: (tc & 0x4) != 0,
            partitions: dev_info.partitions.iter().map(map_partition).collect(),
            chip_name: device.chip().name().to_string(),
            bootctrl: dev_info.bootctrl.as_ref().map(map_bootctrl),
        })
    })
}

#[tauri::command]
pub async fn mtk_read_partition(
    state: State<'_, MtkState>,
    partition_name: String,
    output_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let file = std::fs::File::create(&output_path)
            .map_err(|e| AppError::command(format!("Cannot create '{output_path}': {e}")))?;
        let writer = std::io::BufWriter::new(file);
        let progress = |read: usize, total: usize| {
            if total > 0 {
                info!("Read progress: {}/{} ({:.1}%)", read, total, read as f64 / total as f64 * 100.0);
            }
        };
        device
            .read_partition(&partition_name, writer, progress)
            .map_err(|e| AppError::command(format!("Read partition '{partition_name}' failed: {e}")))?;
        info!("Partition '{}' read to '{}'", partition_name, output_path);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_write_partition(
    state: State<'_, MtkState>,
    partition_name: String,
    input_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let file = std::fs::File::open(&input_path)
            .map_err(|e| AppError::command(format!("Cannot open '{input_path}': {e}")))?;
        let reader = std::io::BufReader::new(file);
        let progress = |written: usize, total: usize| {
            if total > 0 {
                info!("Write progress: {}/{} ({:.1}%)", written, total, written as f64 / total as f64 * 100.0);
            }
        };
        device
            .write_partition(&partition_name, reader, progress)
            .map_err(|e| AppError::command(format!("Write partition '{partition_name}' failed: {e}")))?;
        info!("Partition '{}' written from '{}'", partition_name, input_path);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_erase_partition(state: State<'_, MtkState>, partition_name: String) -> Result<(), AppError> {
    with_device(&state, |device| {
        let progress = |current: usize, total: usize| {
            if total > 0 {
                info!("Erase progress: {}/{} ({:.1}%)", current, total, current as f64 / total as f64 * 100.0);
            }
        };
        device
            .erase_partition(&partition_name, progress)
            .map_err(|e| AppError::command(format!("Erase partition '{partition_name}' failed: {e}")))?;
        info!("Partition '{}' erased", partition_name);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_format_partition(state: State<'_, MtkState>, partition_name: String) -> Result<(), AppError> {
    with_device(&state, |device| {
        let progress = |current: usize, total: usize| {
            if total > 0 {
                info!("Format progress: {}/{} ({:.1}%)", current, total, current as f64 / total as f64 * 100.0);
            }
        };
        device
            .format(&partition_name, progress)
            .map_err(|e| AppError::command(format!("Format partition '{partition_name}' failed: {e}")))?;
        info!("Partition '{}' formatted", partition_name);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_reboot(
    state: State<'_, MtkState>,
    mode: String,
) -> Result<(), AppError> {
    let boot_mode = match mode.to_lowercase().as_str() {
        "normal" => BootMode::Normal,
        "homescreen" => BootMode::HomeScreen,
        "fastboot" => BootMode::Fastboot,
        "test" => BootMode::Test,
        "meta" => BootMode::Meta,
        _ => return Err(AppError::command(format!("Unknown boot mode: '{mode}'. Use: normal, homescreen, fastboot, test, meta"))),
    };
    with_device(&state, |device| {
        device.reboot(boot_mode).map_err(|e| AppError::command(format!("Reboot failed: {e}")))?;
        info!("Device rebooted");
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_shutdown(state: State<'_, MtkState>) -> Result<(), AppError> {
    with_device(&state, |device| {
        device.shutdown().map_err(|e| AppError::command(format!("Shutdown failed: {e}")))?;
        info!("Device shut down");
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_seccfg_lock(state: State<'_, MtkState>, lock: bool) -> Result<(), AppError> {
    with_device(&state, |device| {
        use penumbra::LockFlag;
        let flag = if lock { LockFlag::Lock } else { LockFlag::Unlock };
        device
            .set_seccfg_lock_state(flag)
            .ok_or_else(|| AppError::command("seccfg operation failed or not supported"))?;
        info!("seccfg lock state set to {}", if lock { "lock" } else { "unlock" });
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_peek(
    state: State<'_, MtkState>,
    address: u32,
    size: u32,
    output_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let file = std::fs::File::create(&output_path)
            .map_err(|e| AppError::command(format!("Cannot create '{output_path}': {e}")))?;
        let writer = std::io::BufWriter::new(file);
        let progress = |read: usize, total: usize| {
            if total > 0 {
                info!("Peek progress: {}/{}", read, total);
            }
        };
        device
            .peek(address, size as usize, writer, progress)
            .map_err(|e| AppError::command(format!("Peek at 0x{address:08X} failed: {e}")))?;
        info!("Peeked 0x{size:x} bytes from 0x{address:08X} to '{output_path}'");
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_poke(
    state: State<'_, MtkState>,
    address: u32,
    input_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let data = std::fs::read(&input_path)
            .map_err(|e| AppError::command(format!("Cannot read '{input_path}': {e}")))?;
        let reader = std::io::Cursor::new(data.clone());
        let progress = |written: usize, total: usize| {
            if total > 0 {
                info!("Poke progress: {}/{}", written, total);
            }
        };
        device
            .poke(address, data.len(), reader, progress)
            .map_err(|e| AppError::command(format!("Poke at 0x{address:08X} failed: {e}")))?;
        info!("Poked {} bytes at 0x{address:08X}", data.len());
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_read_offset(
    state: State<'_, MtkState>,
    address: u64,
    size: u64,
    _storage: String,
    output_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let pk = PartitionKind::Emmc(penumbra::core::storage::emmc::EmmcPartition::User);
        let file = std::fs::File::create(&output_path)
            .map_err(|e| AppError::command(format!("Cannot create '{output_path}': {e}")))?;
        let writer = std::io::BufWriter::new(file);
        let progress = |read: usize, total: usize| {
            if total > 0 {
                info!("Offset read progress: {}/{}", read, total);
            }
        };
        device
            .read_offset(address, size as usize, pk, writer, progress)
            .map_err(|e| AppError::command(format!("Read offset 0x{address:X} failed: {e}")))?;
        info!("Read {} bytes from offset 0x{address:X}", size);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_write_offset(
    state: State<'_, MtkState>,
    address: u64,
    _storage: String,
    input_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let pk = PartitionKind::Emmc(penumbra::core::storage::emmc::EmmcPartition::User);
        let data = std::fs::read(&input_path)
            .map_err(|e| AppError::command(format!("Cannot read '{input_path}': {e}")))?;
        let size = data.len();
        let reader = std::io::Cursor::new(data);
        let progress = |written: usize, total: usize| {
            if total > 0 {
                info!("Offset write progress: {}/{}", written, total);
            }
        };
        device
            .write_offset(address, size, pk, reader, progress)
            .map_err(|e| AppError::command(format!("Write offset 0x{address:X} failed: {e}")))?;
        info!("Written {} bytes to offset 0x{address:X}", size);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_download(
    state: State<'_, MtkState>,
    partition_name: String,
    input_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let data = std::fs::read(&input_path)
            .map_err(|e| AppError::command(format!("Cannot read '{input_path}': {e}")))?;
        let size = data.len();
        let reader = std::io::Cursor::new(data);
        let progress = |written: usize, total: usize| {
            if total > 0 {
                info!("Download progress: {}/{} ({:.1}%)", written, total, written as f64 / total as f64 * 100.0);
            }
        };
        device
            .download(&partition_name, size, reader, progress)
            .map_err(|e| AppError::command(format!("Download to '{}' failed: {e}", partition_name)))?;
        info!("Downloaded {} bytes to partition '{}'", size, partition_name);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_upload(
    state: State<'_, MtkState>,
    partition_name: String,
    output_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let file = std::fs::File::create(&output_path)
            .map_err(|e| AppError::command(format!("Cannot create '{output_path}': {e}")))?;
        let writer = std::io::BufWriter::new(file);
        let progress = |read: usize, total: usize| {
            if total > 0 {
                info!("Upload progress: {}/{} ({:.1}%)", read, total, read as f64 / total as f64 * 100.0);
            }
        };
        device
            .upload(&partition_name, writer, progress)
            .map_err(|e| AppError::command(format!("Upload from '{}' failed: {e}", partition_name)))?;
        info!("Uploaded partition '{}' to '{}'", partition_name, output_path);
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_read_rpmb(
    state: State<'_, MtkState>,
    region: String,
    start_sector: u32,
    sector_count: u32,
    output_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let r = match region.to_lowercase().as_str() {
            "1" | "r1" => RpmbRegion::R1,
            "2" | "r2" => RpmbRegion::R2,
            "3" | "r3" => RpmbRegion::R3,
            "4" | "r4" => RpmbRegion::R4,
            _ => return Err(AppError::command(format!("Unknown RPMB region: '{region}'. Use: 1, 2, 3, 4"))),
        };
        let file = std::fs::File::create(&output_path)
            .map_err(|e| AppError::command(format!("Cannot create '{output_path}': {e}")))?;
        let writer = std::io::BufWriter::new(file);
        let progress = |read: usize, total: usize| {
            if total > 0 {
                info!("RPMB read progress: {}/{}", read, total);
            }
        };
        device
            .read_rpmb(r, start_sector, sector_count, writer, progress)
            .map_err(|e| AppError::command(format!("RPMB read failed: {e}")))?;
        info!("RPMB read: region={region}, start={start_sector}, count={sector_count}");
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_write_rpmb(
    state: State<'_, MtkState>,
    region: String,
    start_sector: u32,
    input_path: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let r = match region.to_lowercase().as_str() {
            "1" | "r1" => RpmbRegion::R1,
            "2" | "r2" => RpmbRegion::R2,
            "3" | "r3" => RpmbRegion::R3,
            "4" | "r4" => RpmbRegion::R4,
            _ => return Err(AppError::command(format!("Unknown RPMB region: '{region}'. Use: 1, 2, 3, 4"))),
        };
        let data = std::fs::read(&input_path)
            .map_err(|e| AppError::command(format!("Cannot read '{input_path}': {e}")))?;
        let sectors = data.len() / 256;
        let reader = std::io::Cursor::new(data);
        let progress = |written: usize, total: usize| {
            if total > 0 {
                info!("RPMB write progress: {}/{}", written, total);
            }
        };
        device
            .write_rpmb(r, start_sector, sectors as u32, reader, progress)
            .map_err(|e| AppError::command(format!("RPMB write failed: {e}")))?;
        info!("RPMB write: region={region}, start={start_sector}");
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_auth_rpmb(
    state: State<'_, MtkState>,
    region: String,
    key_hex: String,
) -> Result<(), AppError> {
    with_device(&state, |device| {
        let r = match region.to_lowercase().as_str() {
            "1" | "r1" => RpmbRegion::R1,
            "2" | "r2" => RpmbRegion::R2,
            "3" | "r3" => RpmbRegion::R3,
            "4" | "r4" => RpmbRegion::R4,
            _ => return Err(AppError::command(format!("Unknown RPMB region: '{region}'. Use: 1, 2, 3, 4"))),
        };
        let key = hex::decode(&key_hex)
            .map_err(|e| AppError::command(format!("Invalid hex key: {e}")))?;
        device.auth_rpmb(r, &key).map_err(|e| AppError::command(format!("RPMB auth failed: {e}")))?;
        info!("RPMB authenticated for region {region}");
        Ok(())
    })
}

#[tauri::command]
pub async fn mtk_get_bootctrl(state: State<'_, MtkState>) -> Result<BootCtrlInfo, AppError> {
    with_device(&state, |device| {
        let bc = device.get_bootctrl().map_err(|e| AppError::command(format!("Boot control error: {e}")))?;
        Ok(map_bootctrl(&bc))
    })
}
