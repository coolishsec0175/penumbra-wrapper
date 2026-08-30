/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use crate::models::{FlashProgress, OperationCompleteEvent, OperationOutputEvent};
use anyhow::Context;
use chrono::Utc;
use penumbra_mtk::da::BootMode;
use penumbra_mtk::port::{PortBackend, PortType};
use penumbra_mtk::{Device, DeviceBuilder};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub struct DeviceService {
    inner: Mutex<Option<DeviceState>>,
}

struct DeviceState {
    device: Device<'static, PortType>,
    _da_buf: Box<Vec<u8>>,
    _preloader_buf: Box<Vec<u8>>,
    _auth_buf: Box<Vec<u8>>,
}

impl DeviceService {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn is_connected(&self) -> bool {
        self.inner.lock().unwrap().is_some()
    }

    pub fn disconnect(&self) {
        let mut guard = self.inner.lock().unwrap();
        if let Some(mut state) = guard.take() {
            let _ = state.device.port_mut().close();
            log::info!("Device disconnected");
        }
    }

    pub fn connect(
        &self,
        da_path: &str,
        preloader_path: Option<&str>,
        auth_path: Option<&str>,
    ) -> Result<(), AppError> {
        let da_vec = std::fs::read(da_path)
            .context(format!("Failed to read DA file: {}", da_path))?;
        let preloader_vec = match preloader_path {
            Some(path) => std::fs::read(path)
                .context(format!("Failed to read preloader file: {}", path))?,
            None => Vec::new(),
        };
        let auth_vec = match auth_path {
            Some(path) => std::fs::read(path)
                .context(format!("Failed to read auth file: {}", path))?,
            None => Vec::new(),
        };

        // Box and leak to get &'static [u8] for the DeviceBuilder lifetime
        let da_box = Box::new(da_vec);
        let pl_box = Box::new(preloader_vec);
        let auth_box = Box::new(auth_vec);

        let da_static: &'static [u8] = &*da_box;
        let pl_static: &'static [u8] = if pl_box.is_empty() { &[] } else { &*pl_box };
        let auth_static: &'static [u8] = if auth_box.is_empty() { &[] } else { &*auth_box };

        let port = PortType::find_and_open(None, None, PortBackend::Auto)
            .map_err(|e| AppError::command(format!("Failed to find MTK device: {}", e)))?
            .ok_or_else(|| AppError::DeviceNotConnected)?;

        log::info!("Found MTK port: {}", port.get_port_name());

        let mut builder = DeviceBuilder::new(port)
            .with_da_data(da_static);

        if !pl_static.is_empty() {
            builder = builder.with_preloader(pl_static);
        }
        if !auth_static.is_empty() {
            builder = builder.with_auth(auth_static);
        }

        let mut device = builder
            .build()
            .map_err(|e| AppError::command(format!("Failed to build device: {}", e)))?;

        device
            .init()
            .map_err(|e| AppError::command(format!("Device init failed: {}", e)))?;

        log::info!("Device initialized successfully");

        device
            .enter_da_mode()
            .map_err(|e| AppError::command(format!("Failed to enter DA mode: {}", e)))?;

        log::info!("Device entered DA mode");

        let mut guard = self.inner.lock().unwrap();
        *guard = Some(DeviceState {
            device,
            _da_buf: da_box,
            _preloader_buf: pl_box,
            _auth_buf: auth_box,
        });

        Ok(())
    }

    pub fn with_device<F, R>(&self, f: F) -> Result<R, AppError>
    where
        F: FnOnce(&mut Device<'static, PortType>) -> Result<R, AppError>,
    {
        let mut guard = self.inner.lock().map_err(|e| {
            AppError::command(format!("Device lock poisoned: {}", e))
        })?;

        let state = guard.as_mut().ok_or(AppError::DeviceNotConnected)?;
        f(&mut state.device)
    }
}

fn make_progress_callback(
    app: AppHandle,
    _operation_id: String,
    partition_name: String,
    operation: String,
) -> impl FnMut(usize, usize) {
    let start_time = std::time::Instant::now();
    let mut last_emit = std::time::Instant::now();
    move |done: usize, total: usize| {
        let now = std::time::Instant::now();
        if now.duration_since(last_emit).as_millis() < 100 && done != total {
            return;
        }
        last_emit = now;

        let current = done as u64;
        let total_u64 = total as u64;
        let pct = if total_u64 > 0 {
            (current as f64 / total_u64 as f64 * 100.0).min(100.0) as f32
        } else {
            0.0
        };

        let elapsed = start_time.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 {
            Some(current as f64 / elapsed)
        } else {
            None
        };
        let eta = if let Some(s) = speed {
            if s > 0.0 {
                Some((total_u64 as f64 - current as f64) / s)
            } else {
                None
            }
        } else {
            None
        };

        let event = FlashProgress {
            current,
            total: total_u64,
            percentage: pct,
            partition_name: partition_name.clone(),
            operation: operation.clone(),
            speed_bytes_sec: speed,
            elapsed_secs: Some(elapsed),
            eta_secs: eta,
            message: None,
        };
        let _ = app.emit("operation:progress", event);
    }
}

pub fn emit_output(app: &AppHandle, operation_id: &str, line: &str, is_stderr: bool) {
    let event = OperationOutputEvent {
        operation_id: operation_id.to_string(),
        line: line.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        is_stderr,
    };
    let _ = app.emit("operation:output", event);
}

pub fn emit_complete(app: &AppHandle, operation_id: &str, success: bool, error: Option<String>) {
    let event = OperationCompleteEvent {
        operation_id: operation_id.to_string(),
        success,
        error,
    };
    let _ = app.emit("operation:complete", event);
}

pub fn flash_partition(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    partition: &str,
    image_path: &str,
) -> Result<(), AppError> {
    let file = std::fs::File::open(image_path)
        .context(format!("Failed to open image file: {}", image_path))?;
    let file_size = file.metadata().map(|m| m.len() as usize).unwrap_or(0);
    let reader = std::io::BufReader::new(file);

    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        partition.to_string(),
        "flash".to_string(),
    );

    emit_output(app, operation_id, &format!("Flashing partition '{}'...", partition), false);

    service.with_device(|device| {
        device
            .write_partition(partition, file_size, reader, progress_cb)
            .map_err(|e| AppError::command(format!("Flash failed: {}", e)))?;
        emit_output(app, operation_id, &format!("Partition '{}' flashed successfully", partition), false);
        Ok(())
    })
}

pub fn read_partition_to_file(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    partition: &str,
    output_path: &str,
) -> Result<(), AppError> {
    let file = std::fs::File::create(output_path)
        .context(format!("Failed to create output file: {}", output_path))?;
    let writer = std::io::BufWriter::new(file);

    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        partition.to_string(),
        "read".to_string(),
    );

    emit_output(app, operation_id, &format!("Reading partition '{}'...", partition), false);

    service.with_device(|device| {
        device
            .read_partition(partition, writer, progress_cb)
            .map_err(|e| AppError::command(format!("Read failed: {}", e)))?;
        emit_output(app, operation_id, &format!("Partition '{}' read successfully", partition), false);
        Ok(())
    })
}

pub fn erase_partition_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    partition: &str,
) -> Result<(), AppError> {
    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        partition.to_string(),
        "erase".to_string(),
    );

    emit_output(app, operation_id, &format!("Erasing partition '{}'...", partition), false);

    service.with_device(|device| {
        device
            .erase_partition(partition, progress_cb)
            .map_err(|e| AppError::command(format!("Erase failed: {}", e)))?;
        emit_output(app, operation_id, &format!("Partition '{}' erased successfully", partition), false);
        Ok(())
    })
}

pub fn format_partition_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    partition: &str,
) -> Result<(), AppError> {
    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        partition.to_string(),
        "format".to_string(),
    );

    emit_output(app, operation_id, &format!("Formatting partition '{}'...", partition), false);

    service.with_device(|device| {
        device
            .erase_partition(partition, progress_cb)
            .map_err(|e| AppError::command(format!("Format failed: {}", e)))?;
        emit_output(app, operation_id, &format!("Partition '{}' formatted successfully", partition), false);
        Ok(())
    })
}

pub fn list_partitions_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
) -> Result<Vec<crate::models::Partition>, AppError> {
    emit_output(app, operation_id, "Reading partition table...", false);

    service.with_device(|device| {
        let partitions = device.partitions();
        let result: Vec<crate::models::Partition> = partitions
            .into_iter()
            .map(|p| {
                let size_hex = format!("0x{:X}", p.size);
                let display_size = format_size(p.size);
                crate::models::Partition {
                    name: p.name,
                    start: format!("0x{:X}", p.address),
                    size: size_hex,
                    display_size: Some(display_size),
                }
            })
            .collect();
        emit_output(app, operation_id, &format!("Found {} partitions", result.len()), false);
        Ok(result)
    })
}

pub fn reboot_device_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    mode: &str,
) -> Result<(), AppError> {
    let boot_mode = match mode.to_lowercase().as_str() {
        "fastboot" => BootMode::Fastboot,
        "recovery" => BootMode::Meta,
        "normal" | "" => BootMode::Normal,
        "test" => BootMode::Test,
        _ => return Err(AppError::command(format!("Unknown reboot mode: {}", mode))),
    };

    emit_output(app, operation_id, &format!("Rebooting to {} mode...", mode), false);

    service.with_device(|device| {
        device
            .reboot(boot_mode)
            .map_err(|e| AppError::command(format!("Reboot failed: {}", e)))?;
        emit_output(app, operation_id, "Device rebooted", false);
        Ok(())
    })
}

pub fn shutdown_device_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
) -> Result<(), AppError> {
    emit_output(app, operation_id, "Shutting down device...", false);

    service.with_device(|device| {
        device
            .shutdown()
            .map_err(|e| AppError::command(format!("Shutdown failed: {}", e)))?;
        emit_output(app, operation_id, "Device shut down", false);
        Ok(())
    })
}

pub fn seccfg_set_state(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    action: &str,
) -> Result<(), AppError> {
    use penumbra_mtk::hacc::LockState;

    let state = match action.to_lowercase().as_str() {
        "unlock" => LockState::Unlock,
        "lock" => LockState::Lock,
        _ => return Err(AppError::command(format!("Unknown seccfg action: {}", action))),
    };

    emit_output(app, operation_id, &format!("Setting seccfg to '{}'...", action), false);

    service.with_device(|device| {
        device
            .set_seccfg_lock_state(state)
            .map_err(|e| AppError::command(format!("Seccfg operation failed: {}", e)))?;
        emit_output(app, operation_id, &format!("Seccfg set to '{}'", action), false);
        Ok(())
    })
}

pub fn read_all_partitions_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    output_dir: &str,
    skip_partitions: &[String],
) -> Result<(), AppError> {
    let output_path = std::path::PathBuf::from(output_dir);

    service.with_device(|device| {
        let partitions = device.partitions();
        let total = partitions.len();
        let mut skipped = 0;

        for (idx, partition) in partitions.iter().enumerate() {
            if skip_partitions.contains(&partition.name) {
                emit_output(app, operation_id, &format!("Skipping partition '{}'", partition.name), false);
                skipped += 1;
                continue;
            }

            let out_file = output_path.join(format!("{}.img", partition.name));
            emit_output(
                app,
                operation_id,
                &format!("[{}/{}] Reading '{}'...", idx + 1, total, partition.name),
                false,
            );

            let file = std::fs::File::create(&out_file)
                .map_err(|e| AppError::command(format!("Failed to create {}: {}", out_file.display(), e)))?;
            let writer = std::io::BufWriter::new(file);

            let progress_cb = make_progress_callback(
                app.clone(),
                operation_id.to_string(),
                partition.name.clone(),
                "read-all".to_string(),
            );

            device
                .read_partition(&partition.name, writer, progress_cb)
                .map_err(|e| AppError::command(format!("Failed to read '{}': {}", partition.name, e)))?;
        }

        emit_output(
            app,
            operation_id,
            &format!("Read {} partitions ({} skipped)", total - skipped, skipped),
            false,
        );
        Ok(())
    })
}

pub fn write_all_partitions_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    input_dir: &str,
) -> Result<(), AppError> {
    let input_path = std::path::PathBuf::from(input_dir);

    service.with_device(|device| {
        let partitions = device.partitions();
        let total = partitions.len();
        let mut written = 0;

        for (idx, partition) in partitions.iter().enumerate() {
            let img_path = input_path.join(format!("{}.img", partition.name));
            if !img_path.exists() {
                emit_output(
                    app,
                    operation_id,
                    &format!("[{}/{}] Skipping '{}' (no image file)", idx + 1, total, partition.name),
                    false,
                );
                continue;
            }

            emit_output(
                app,
                operation_id,
                &format!("[{}/{}] Writing '{}'...", idx + 1, total, partition.name),
                false,
            );

            let file = std::fs::File::open(&img_path)
                .map_err(|e| AppError::command(format!("Failed to open {}: {}", img_path.display(), e)))?;
            let file_size = file.metadata().map(|m| m.len() as usize).unwrap_or(0);
            let reader = std::io::BufReader::new(file);

            let progress_cb = make_progress_callback(
                app.clone(),
                operation_id.to_string(),
                partition.name.clone(),
                "write-all".to_string(),
            );

            device
                .write_partition(&partition.name, file_size, reader, progress_cb)
                .map_err(|e| AppError::command(format!("Failed to write '{}': {}", partition.name, e)))?;
            written += 1;
        }

        emit_output(
            app,
            operation_id,
            &format!("Wrote {} of {} partitions", written, total),
            false,
        );
        Ok(())
    })
}

pub fn set_active_slot_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    slot: &str,
) -> Result<(), AppError> {
    use penumbra_mtk::hacc::{BootControl, BootPartition, OFFSET_SLOT_SUFFIX};

    let boot_partition = match slot.to_lowercase().as_str() {
        "a" => BootPartition::A,
        "b" => BootPartition::B,
        _ => return Err(AppError::command(format!("Invalid slot '{}'. Expected 'a' or 'b'.", slot))),
    };

    emit_output(app, operation_id, &format!("Setting active slot to '{}'...", slot), false);

    service.with_device(|device| {
        let mut bootctrl = device
            .get_bootctrl()
            .map_err(|e| AppError::command(format!("Failed to read boot control: {}", e)))?;

        bootctrl.set_active_slot(boot_partition);

        // Read the full misc/para partition, patch bootctrl at offset 0x800, write back
        let partition_name = if device.get_partition("misc").is_some() {
            "misc"
        } else {
            "para"
        };

        let mut partition_buf = Vec::new();
        let bootctrl_size = core::mem::size_of::<BootControl>();

        device
            .read_partition(partition_name, &mut partition_buf, |_d, _t| {})
            .map_err(|e| AppError::command(format!("Failed to read '{}' partition: {}", partition_name, e)))?;

        // Ensure buffer is large enough for the bootctrl region
        let required_len = OFFSET_SLOT_SUFFIX + bootctrl_size;
        if partition_buf.len() < required_len {
            partition_buf.resize(required_len, 0);
        }

        // Write the modified bootctrl into the buffer at the correct offset
        let bootctrl_bytes = bootctrl.as_bytes();
        partition_buf[OFFSET_SLOT_SUFFIX..OFFSET_SLOT_SUFFIX + bootctrl_size]
            .copy_from_slice(bootctrl_bytes);

        let reader = std::io::Cursor::new(partition_buf.clone());
        let size = partition_buf.len();

        device
            .write_partition(partition_name, size, reader, |_d, _t| {})
            .map_err(|e| AppError::command(format!("Failed to write boot control to '{}': {}", partition_name, e)))?;

        emit_output(app, operation_id, &format!("Active slot set to '{}'", slot), false);
        Ok(())
    })
}

pub fn get_device_info(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
) -> Result<crate::models::DeviceInfo, AppError> {
    use penumbra_mtk::StorageKind;

    emit_output(app, operation_id, "Reading device info...", false);

    service.with_device(|device| {
        let devinfo = device.devinfo();
        let chip_name = devinfo.chip().map(|c| format!("{:?}", c));
        let hw_code = devinfo.hw_code();
        let hw_subcode = devinfo.hw_subcode();
        let soc_id = devinfo.soc_id().to_vec();
        let meid = devinfo.meid().to_vec();
        let target_config = devinfo.target_config();
        let sbc_enabled = devinfo.sbc_enabled();
        let sla_enabled = devinfo.sla_enabled();
        let daa_enabled = devinfo.daa_enabled();

        let storage = match device.get_storage() {
            Some(StorageKind::Emmc(_)) => "EMMC".to_string(),
            Some(StorageKind::Ufs(_)) => "UFS".to_string(),
            None => "Unknown".to_string(),
        };

        let active_slot = device
            .get_bootctrl()
            .ok()
            .and_then(|bc| bc.get_current_suffix().map(|s| s.to_string()));

        let info = crate::models::DeviceInfo {
            chip: chip_name,
            hw_code,
            hw_subcode,
            soc_id,
            meid,
            storage,
            target_config,
            sbc_enabled,
            sla_enabled,
            daa_enabled,
            active_slot,
        };

        emit_output(
            app,
            operation_id,
            &format!(
                "Device: chip={:?}, hw_code=0x{:04X}, storage={}",
                info.chip, info.hw_code, info.storage
            ),
            false,
        );

        Ok(info)
    })
}

pub fn flash_scatter_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    scatter_path: &str,
    firmware_dir: &str,
) -> Result<(), AppError> {
    let scatter_content = std::fs::read_to_string(scatter_path)
        .context(format!("Failed to read scatter file: {}", scatter_path))?;
    let firmware_path = std::path::PathBuf::from(firmware_dir);

    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        "scatter".to_string(),
        "flash-scatter".to_string(),
    );

    emit_output(app, operation_id, &format!("Flashing from scatter: {}", scatter_path), false);

    service.with_device(|device| {
        let firmware_dir_clone = firmware_path.clone();
        let reader_source = move |path: &str| -> Result<(std::io::BufReader<std::fs::File>, usize), penumbra_mtk::Error> {
            let file_path = std::path::Path::new(path);
            let resolved = if file_path.is_absolute() {
                file_path.to_path_buf()
            } else {
                firmware_dir_clone.join(path)
            };

            let file = std::fs::File::open(&resolved).map_err(penumbra_mtk::Error::from)?;
            let size = file.metadata().map(|m| m.len() as usize).unwrap_or(0);
            Ok((std::io::BufReader::new(file), size))
        };

        let writer_sink = |path: &str| -> Result<std::io::BufWriter<std::fs::File>, penumbra_mtk::Error> {
            let file = std::fs::File::create(path).map_err(penumbra_mtk::Error::from)?;
            Ok(std::io::BufWriter::new(file))
        };

        device
            .flash_scatter(&scatter_content, reader_source, writer_sink, progress_cb)
            .map_err(|e| AppError::command(format!("Scatter flash failed: {}", e)))?;

        emit_output(app, operation_id, "Scatter flash completed successfully", false);
        Ok(())
    })
}

fn parse_section(section: &str) -> Result<penumbra_mtk::PartitionKind, AppError> {
    use penumbra_mtk::storage::{EmmcPartition, UfsPartition};
    match section.to_lowercase().as_str() {
        "emmc_user" | "user" => Ok(penumbra_mtk::PartitionKind::Emmc(EmmcPartition::User)),
        "emmc_boot1" | "boot1" => Ok(penumbra_mtk::PartitionKind::Emmc(EmmcPartition::Boot1)),
        "emmc_boot2" | "boot2" => Ok(penumbra_mtk::PartitionKind::Emmc(EmmcPartition::Boot2)),
        "ufs_lu0" | "lu0" => Ok(penumbra_mtk::PartitionKind::Ufs(UfsPartition::Lu0)),
        "ufs_lu1" | "lu1" => Ok(penumbra_mtk::PartitionKind::Ufs(UfsPartition::Lu1)),
        "ufs_lu2" | "lu2" => Ok(penumbra_mtk::PartitionKind::Ufs(UfsPartition::Lu2)),
        _ => Err(AppError::command(format!(
            "Unknown section '{}'. Valid: user, boot1, boot2, lu0, lu1, lu2",
            section
        ))),
    }
}

pub fn read_offset_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    address: u64,
    size: usize,
    section: &str,
    output_path: &str,
) -> Result<(), AppError> {
    let part_kind = parse_section(section)?;
    let file = std::fs::File::create(output_path)
        .context(format!("Failed to create output file: {}", output_path))?;
    let writer = std::io::BufWriter::new(file);

    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        format!("offset@0x{:X}", address),
        "read-offset".to_string(),
    );

    emit_output(
        app,
        operation_id,
        &format!("Reading {} bytes at offset 0x{:X} (section: {})...", size, address, section),
        false,
    );

    service.with_device(|device| {
        device
            .read_offset(address, size, part_kind, writer, progress_cb)
            .map_err(|e| AppError::command(format!("Read offset failed: {}", e)))?;
        emit_output(
            app,
            operation_id,
            &format!("Read {} bytes to {}", size, output_path),
            false,
        );
        Ok(())
    })
}

pub fn write_offset_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    address: u64,
    section: &str,
    input_path: &str,
) -> Result<(), AppError> {
    let part_kind = parse_section(section)?;
    let file = std::fs::File::open(input_path)
        .context(format!("Failed to open input file: {}", input_path))?;
    let file_size = file.metadata().map(|m| m.len() as usize).unwrap_or(0);
    let reader = std::io::BufReader::new(file);

    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        format!("offset@0x{:X}", address),
        "write-offset".to_string(),
    );

    emit_output(
        app,
        operation_id,
        &format!("Writing {} bytes at offset 0x{:X} (section: {})...", file_size, address, section),
        false,
    );

    service.with_device(|device| {
        device
            .write_offset(address, file_size, part_kind, reader, progress_cb)
            .map_err(|e| AppError::command(format!("Write offset failed: {}", e)))?;
        emit_output(
            app,
            operation_id,
            &format!("Wrote {} bytes at offset 0x{:X}", file_size, address),
            false,
        );
        Ok(())
    })
}

pub fn erase_offset_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    address: u64,
    size: usize,
    section: &str,
) -> Result<(), AppError> {
    let part_kind = parse_section(section)?;

    let progress_cb = make_progress_callback(
        app.clone(),
        operation_id.to_string(),
        format!("offset@0x{:X}", address),
        "erase-offset".to_string(),
    );

    emit_output(
        app,
        operation_id,
        &format!("Erasing {} bytes at offset 0x{:X} (section: {})...", size, address, section),
        false,
    );

    service.with_device(|device| {
        device
            .erase_offset(address, size, part_kind, progress_cb)
            .map_err(|e| AppError::command(format!("Erase offset failed: {}", e)))?;
        emit_output(
            app,
            operation_id,
            &format!("Erased {} bytes at offset 0x{:X}", size, address),
            false,
        );
        Ok(())
    })
}

pub fn read_efuses_direct(
    service: &DeviceService,
    app: &AppHandle,
    operation_id: &str,
    output_path: &str,
) -> Result<(), AppError> {
    let file = std::fs::File::create(output_path)
        .context(format!("Failed to create efuse dump file: {}", output_path))?;
    let writer = std::io::BufWriter::new(file);

    emit_output(app, operation_id, "Reading efuses...", false);

    service.with_device(|device| {
        device
            .read_efuses(writer)
            .map_err(|e| AppError::command(format!("Efuse read failed: {}", e)))?;
        emit_output(
            app,
            operation_id,
            &format!("Efuse dump saved to {}", output_path),
            false,
        );
        Ok(())
    })
}

fn format_size(bytes: usize) -> String {
    const KB: usize = 1024;
    const MB: usize = 1024 * KB;
    const GB: usize = 1024 * MB;
    const TB: usize = 1024 * GB;

    if bytes >= TB {
        format!("{:.1} TiB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.1} GiB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MiB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KiB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
