/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025-2026 Shomy
*/

#[macro_export]
macro_rules! cli_commands {
    (
        device {
            $( $dev_variant:ident ($dev_ty:ty) ),* $(,)?
        }
        cli {
            $( $loc_variant:ident ($loc_ty:ty) ),* $(,)?
        }
    ) => {
        #[derive(clap::Subcommand, Debug)]
        pub enum Commands {
            $(
                #[command(
                    aliases = <$dev_ty as $crate::cli::common::CommandMetadata>::aliases(),
                    visible_aliases = <$dev_ty as $crate::cli::common::CommandMetadata>::visible_aliases(),
                    about = <$dev_ty as $crate::cli::common::CommandMetadata>::about(),
                    long_about = <$dev_ty as $crate::cli::common::CommandMetadata>::long_about(),
                    hide = <$dev_ty as $crate::cli::common::CommandMetadata>::hide(),
                )]
                $dev_variant($dev_ty),
            )*
            $(
                #[command(
                    aliases = <$loc_ty as $crate::cli::common::CommandMetadata>::aliases(),
                    visible_aliases = <$loc_ty as $crate::cli::common::CommandMetadata>::visible_aliases(),
                    about = <$loc_ty as $crate::cli::common::CommandMetadata>::about(),
                    long_about = <$loc_ty as $crate::cli::common::CommandMetadata>::long_about(),
                    hide = <$loc_ty as $crate::cli::common::CommandMetadata>::hide(),
                )]
                $loc_variant($loc_ty),
            )*
        }

        impl Commands {
            pub async fn execute(
                &self,
                args: &$crate::cli::CliArgs,
                state: &mut $crate::cli::state::PersistedDeviceState,
            ) -> anyhow::Result<()> {
                match self {
                    $(
                        Commands::$dev_variant(inner) => {
                            let mut dev = $crate::cli::helpers::setup_device(args, state).await?;
                            $crate::cli::DeviceCommand::run(inner, &mut dev, state)?;
                            state.target_config = dev.dev_info.target_config();
                            Ok(())
                        }
                    )*
                    $(
                        Commands::$loc_variant(inner) => {
                            $crate::cli::LocalCommand::run(inner, state)?;
                            Ok(())
                        }
                    )*
                }
            }
        }
    };
}

pub(crate) use cli_commands;
