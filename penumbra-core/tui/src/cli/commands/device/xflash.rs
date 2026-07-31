/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/

use std::fs::{File, metadata};
use std::io::BufReader;
use std::path::PathBuf;

use anyhow::{Result, anyhow};
use clap::{Args, Subcommand};
use log::info;
use penumbra::Device;
use penumbra::da::DAProtocol;
use penumbra::da::xflash::flash::set_rsc_info;

use crate::cli::DeviceCommand;
use crate::cli::common::{CONN_DA, CommandMetadata};
use crate::cli::helpers::AntumbraProgress;
use crate::cli::state::PersistedDeviceState;

#[derive(Args, Debug)]
pub struct RscFlashArgs {
    /// Partition to flash
    pub partition: String,
    /// File to flash
    pub file: PathBuf,
}

impl DeviceCommand for RscFlashArgs {
    fn run(&self, dev: &mut Device, state: &mut PersistedDeviceState) -> Result<()> {
        dev.enter_da_mode()?;
        state.connection_type = CONN_DA;
        state.flash_mode = 1;

        let file = File::open(&self.file)?;
        let mut reader = BufReader::new(file);

        let file_size = metadata(&self.file)?.len();

        let Some(part) = dev.dev_info.get_partition(&self.partition) else {
            return Err(anyhow::anyhow!("Partition '{}' not found on device.", self.partition));
        };

        if file_size > part.size as u64 {
            return Err(anyhow::anyhow!(
                "File size ({}) exceeds partition size ({}).",
                file_size,
                part.size
            ));
        }

        let mut proto = dev.get_protocol().unwrap();
        let xflash = if let DAProtocol::V5(xflash) = &mut proto {
            xflash
        } else {
            return Err(anyhow!("Protocol is not XFlash!"));
        };

        let pb = AntumbraProgress::new(file_size);

        let mut progress_callback = pb.get_callback("Flashing RSC...", "RSC flash complete!");

        info!("Flashing file {:?} to partition {} with RSC", self.file, part.name);

        set_rsc_info(xflash, &part.name, file_size as usize, &mut reader, &mut progress_callback)?;

        info!("Flashing to partition '{}' completed.", part.name);

        Ok(())
    }
}

#[derive(Debug, Subcommand)]
pub enum XFlashSubcommand {
    RscFlash(RscFlashArgs),
}

#[derive(Args, Debug)]
pub struct XFlashArgs {
    #[command(subcommand)]
    pub command: XFlashSubcommand,
}

impl CommandMetadata for XFlashArgs {
    fn visible_aliases() -> &'static [&'static str] {
        &["xf"]
    }

    fn about() -> &'static str {
        "XFlash-specific commands."
    }

    fn long_about() -> &'static str {
        "Commands specific to XFlash / V5 devices."
    }
}

impl DeviceCommand for XFlashArgs {
    fn run(&self, dev: &mut Device, state: &mut PersistedDeviceState) -> Result<()> {
        match &self.command {
            XFlashSubcommand::RscFlash(cmd) => cmd.run(dev, state),
        }
    }
}
