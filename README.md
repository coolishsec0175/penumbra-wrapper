# PenumbraWrapper

A Windows GUI for **antumbra**, the flash tool from the Penumbra project.

## About

PenumbraWrapper is a Tauri + React GUI that wraps **antumbra** (the CLI flash
tool from Penumbra). It provides a friendly interface for flashing firmware,
readback, bootloader unlocking, and other MediaTek device operations.

## Downloads

Nightly builds (NSIS `.exe` installer and MSI) are published to the
[nightly release](https://github.com/coolishsec0175/penumbra-wrapper/releases/tag/nightly)
on every push to `main`.

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
