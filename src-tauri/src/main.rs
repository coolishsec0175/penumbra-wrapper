/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod models;
mod services;

use services::device_service::DeviceService;

fn init_logging() {
    let log_dir = dirs::config_dir()
        .map(|dir| dir.join("penumbra-wrapper"))
        .unwrap_or_else(|| std::env::temp_dir().join("penumbra-wrapper"));

    let _ = std::fs::create_dir_all(&log_dir);
    let log_file = log_dir.join("penumbra-wrapper.log");

    let log_file = match fern::log_file(log_file) {
        Ok(file) => file,
        Err(err) => {
            eprintln!("Failed to open log file: {}", err);
            return env_logger::init();
        }
    };

    let file_dispatch = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] {}",
                chrono::Utc::now().to_rfc3339(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Debug)
        .chain(log_file);

    let stdout_dispatch = fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] {}",
                chrono::Utc::now().to_rfc3339(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Info)
        .chain(std::io::stdout());

    let logger = fern::Dispatch::new()
        .level(log::LevelFilter::Debug)
        .chain(stdout_dispatch)
        .chain(file_dispatch);

    if logger.apply().is_err() {
        env_logger::init();
    }
}

#[tokio::main]
async fn main() {
    init_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_penumbra_version,
            commands::cancel_operation,
            commands::device::list_partitions,
            commands::device::reboot_device,
            commands::device::shutdown_device,
            commands::device::get_device_info,
            commands::flash::flash_partition,
            commands::flash::flash_scatter,
            commands::read::read_partition,
            commands::format::format_partition,
            commands::erase::erase_partition,
            commands::tools::read_all_partitions,
            commands::tools::write_all_partitions,
            commands::tools::crash_command,
            commands::tools::seccfg_operation,
            commands::tools::boot_pl,
            commands::tools::read_offset,
            commands::tools::write_offset,
            commands::tools::erase_offset,
            commands::tools::read_efuses,
            commands::scatter::parse_scatter_file,
            commands::scatter::detect_image_files,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::updates::check_penumbra_update,

            commands::fastboot::force_fastboot,
            commands::fastboot::cancel_fastboot,
            commands::logs::export_log_file,
            commands::raw::set_active_slot,

            commands::mtkclient::mtk_status,
            commands::mtkclient::mtk_cancel_operation,
            commands::mtkclient::mtk_print_gpt,
            commands::mtkclient::mtk_read_partition,
            commands::mtkclient::mtk_write_partition,
            commands::mtkclient::mtk_erase_partition,
            commands::mtkclient::mtk_dump_brom,
            commands::mtkclient::mtk_dump_preloader,
            commands::mtkclient::mtk_dump_sram,
            commands::mtkclient::mtk_crash,
            commands::mtkclient::mtk_reboot,
            commands::mtkclient::mtk_seccfg,
            commands::mtkclient::mtk_generate_keys,
            commands::mtkclient::mtk_read_all,
            commands::mtkclient::mtk_write_all,
            commands::mtkclient::mtk_set_active_slot,

            commands::amonet::amonet_scan_ports,
            commands::amonet::amonet_execute,
            commands::amonet::amonet_cancel,

            commands::adb::adb_list_devices,
            commands::adb::adb_shell_command,
            commands::adb::adb_get_device_props,
            commands::adb::adb_reboot,
            commands::adb::adb_push,
            commands::adb::adb_pull,
            commands::adb::adb_logcat,
            commands::adb::adb_sideload,

            commands::fastboot_native::fastboot_scan_devices,
            commands::fastboot_native::fastboot_get_var,
            commands::fastboot_native::fastboot_get_all_vars,
            commands::fastboot_native::fastboot_flash,
            commands::fastboot_native::fastboot_erase,
            commands::fastboot_native::fastboot_boot,
            commands::fastboot_native::fastboot_reboot,
            commands::fastboot_native::fastboot_set_active_slot,
            commands::fastboot_native::fastboot_oem,
            commands::fastboot_native::fastboot_oem_unlock,
            commands::fastboot_native::fastboot_oem_lock,
            commands::fastboot_native::fastboot_wait_for_device,
        ])
        .manage(DeviceService::new())
        .manage(commands::fastboot::FastbootCancel::default())
        .setup(|_app| {
            log::info!("PenumbraWrapper starting...");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Disconnect the device when the window is closed
                if let Some(service) = window.try_state::<DeviceService>() {
                    service.disconnect();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
