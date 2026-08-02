# PenumbraWrapper

A Windows GUI for **antumbra**, the flash tool from the Penumbra project.

## About

PenumbraWrapper is a Tauri + React GUI that wraps **antumbra** (the CLI flash
tool from Penumbra). It provides a friendly interface for MediaTek device
operations including full partition backup/restore, preloader fastboot
handshake, bootloader unlocking, and Windows environment diagnostics.

## Downloads

Nightly builds (NSIS `.exe` installer and MSI) are published to the
[nightly release](https://github.com/coolishsec0175/penumbra-wrapper/releases/tag/nightly)
on every push to `main`.

## Features

- **Backup All / Restore All** — read or write every partition with a
  partition skip-list (persisted in settings).
- **Force Fastboot** — preloader serial handshake to switch MTK devices into
  Fastboot mode, with fastboot-mode detection and cancellation.
- **Bootloader** — unlock/lock (`seccfg`), set active slot, debug crash
  command.
- **Windows Diagnostics** — environment checks with exportable zip bundle.

## Building from source

- Install [Node.js](https://nodejs.org) and [Rust](https://rustup.rs).
- `npm install`
- `npm run tauri:dev` for development, or `npm run tauri:build` for a release build.

## Credits

- [shomykohai/penumbra](https://github.com/shomykohai/penumbra) — the original
  Penumbra core and antumbra binary (AGPL-3.0).
- [ardiandideyashidiq/penumbra-wrapper](https://github.com/ardiandideyashidiq/penumbra-wrapper)
  — the wrapper base this project was forked from.

This project is forked from ardiandideyashidiq's penumbra-wrapper and uses a
fork of shomykohai's penumbra for the antumbra binary.

## License

AGPL-3.0-or-later
