# MTK Payloads

This directory contains payload binaries from [shomykohai/mtk-payloads](https://github.com/shomykohai/mtk-payloads).

## Required Files

Download the compiled binaries from the [releases](https://github.com/shomykohai/mtk-payloads/releases) or build them from source.

### BROM Exploits (for kamakiri/linecode)

| File | Description |
|------|-------------|
| `brom_defuse.bin` | BROM security bypass for Legacy/V5 devices |

### DA Extension Loaders

| File | Description |
|------|-------------|
| `extloader_v5.bin` | V5 DA extension loader (restores boot_to) |
| `extloaderv6_arm.bin` | V6 DA extension loader (ARM32) |
| `extloaderv6_arm64.bin` | V6 DA extension loader (ARM64) |

### V6 Exploits

| File | Description |
|------|-------------|
| `hakujoudai_arm.bin` | V6 heap exploit (ARM32) |
| `hakujoudai_arm64.bin` | V6 heap exploit (ARM64) |

### SLA Bypass

| File | Description |
|------|-------------|
| `sla_xml_arm.bin` | SLA bypass for V6 (ARM32) |
| `sla_xml_arm64.bin` | SLA bypass for V6 (ARM64) |

## Usage

Place the `.bin` files in this directory. The tool will automatically detect and use them.

## Building from Source

```bash
git clone https://github.com/shomykohai/mtk-payloads
cd mtk-payloads
./build_all.sh
cp payloads/*.bin /path/to/penumbra-wrapper/payloads/
```

## License

These payloads are licensed under AGPL-3.0-or-later.
