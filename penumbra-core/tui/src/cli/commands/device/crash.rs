/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/

use std::time::{Duration, Instant};

use anyhow::Result;
use clap::Args;
use log::info;
use penumbra::{Device, find_mtk_port};

use crate::cli::DeviceCommand;
use crate::cli::common::{CONN_BR, CONN_DA, CommandMetadata};
use crate::cli::state::PersistedDeviceState;

#[derive(Args, Debug)]
pub struct CrashArgs {}

impl CommandMetadata for CrashArgs {
    fn about() -> &'static str {
        "Crash the device to bootrom."
    }

    fn long_about() -> &'static str {
        "Crash the device into bootrom by triggering an assertion."
    }
}

impl DeviceCommand for CrashArgs {
    fn run(&self, dev: &mut Device, state: &mut PersistedDeviceState) -> Result<()> {
        if state.connection_type == CONN_DA {
            info!("The device can't be crashed while in DA mode.");
            info!("Please reboot the device into Preloader mode and try again.");
            return Ok(());
        };

        let dummy_data = [0u8; 0x100];
        let data_len = dummy_data.len() as u32;

        info!("Crashing device...");

        // We ignore the error since this is the expected behaviour!!
        dev.get_connection()?.send_da(&dummy_data, data_len, 0, data_len).ok();
        dev.get_connection()?.port.close()?;

        let mut last_seen = Instant::now();
        let sleep_timeout = Duration::from_millis(500);
        let timeout = Duration::from_secs(5);
        let start = Instant::now();

        info!("Waiting for MTK device...");
        let mtk_port = loop {
            if let Some(port) = find_mtk_port() {
                info!("Found MTK port: {}", port.get_port_name());
                break port;
            } else if Instant::now() > start + timeout {
                return Err(anyhow::anyhow!("Device didn't come back online in time."));
            } else if last_seen.elapsed() > sleep_timeout {
                last_seen = Instant::now();
            }
        };

        dev.get_connection()?.port = mtk_port;

        dev.get_connection()?.handshake()?;

        state.connection_type = CONN_BR;

        Ok(())
    }
}
