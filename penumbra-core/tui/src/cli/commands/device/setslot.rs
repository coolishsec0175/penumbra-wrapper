/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/

use anyhow::Result;
use clap::{Args, ValueEnum};
use log::info;
use penumbra::Device;
use penumbra::core::bootctrl::{BootControl, BootPartition, OFFSET_SLOT_SUFFIX};
use wincode::Serialize;

use crate::cli::DeviceCommand;
use crate::cli::common::{CONN_DA, CommandMetadata};
use crate::cli::state::PersistedDeviceState;

#[derive(Debug, ValueEnum, Clone)]
pub enum ActiveSlot {
    A,
    B,
}

impl From<ActiveSlot> for BootPartition {
    fn from(slot: ActiveSlot) -> Self {
        match slot {
            ActiveSlot::A => BootPartition::A,
            ActiveSlot::B => BootPartition::B,
        }
    }
}

impl CommandMetadata for SetActiveSlotArgs {
    fn visible_aliases() -> &'static [&'static str] {
        &["setslot"]
    }

    fn about() -> &'static str {
        "Set the active boot slot."
    }

    fn long_about() -> &'static str {
        "Set the active boot slot by modifying the Boot Control partition.\n\
        This will determine which slot the device will boot from on the next reboot."
    }
}

#[derive(Args, Debug)]
pub struct SetActiveSlotArgs {
    #[arg(value_enum)]
    pub slot: ActiveSlot,
}

impl DeviceCommand for SetActiveSlotArgs {
    fn run(&self, dev: &mut Device, state: &mut PersistedDeviceState) -> Result<()> {
        dev.enter_da_mode()?;

        state.connection_type = CONN_DA;
        state.flash_mode = 1;

        let new_slot: BootPartition = self.slot.clone().into();

        let mut bootctrl = dev.get_bootctrl()?;

        let current_slot = bootctrl.get_active_slot();
        if current_slot == new_slot {
            info!("Active slot is already set to {:?}.", self.slot);
            return Ok(());
        }

        bootctrl.set_active_slot(new_slot);

        let mut new_data = [0u8; OFFSET_SLOT_SUFFIX + size_of::<BootControl>()];

        BootControl::serialize_into(&mut new_data[OFFSET_SLOT_SUFFIX..], &bootctrl)?;

        dev.download(&bootctrl.bctrl_part, new_data.len(), &new_data[..], |_, _| {})?;

        info!("Active slot set to {:?}.", self.slot);

        Ok(())
    }
}
