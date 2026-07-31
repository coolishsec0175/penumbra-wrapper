## What are DA Extensions?

DA Extensions are payloads that work like an addon for stock [Download Agent|DAs], allowing to extend the features of it.
Many tools use the extensions developed by [bkerler](https://github.com/bkerler) for [mtkclient](https://github.com/bkerler), some others like [[Penumbra]] or [Chimera](https://chimeratool.com/) have their owns.

DA Extensions are available for [[XFlash DA Protocol|XFlash]] and [[XML DA Protocol|XML]] Download Agents.

## How do they work?

To load DA Extensions, you first need to be able to boot patched download agents (or at least, a custom DA2).
This is to ensure hash check is disabled.

The DA Extensions are loaded at `0x68000000` (which usually is located in the DA2 far heap space), to ensure the original DA2 is not being overwritten.
The load address is not particularly important as long as it doesn't interfere with normal execution.
In a 2025 mtkclient update, a PR was merged to allow loading extensions at `0x4FFF0000` for low memory devices using [[XFlash DA Protocol|XFlash]] protocol.

Before being sent, the DA extension binary is patched to hook into the original DA2 handlers.

## Features

* Restored memory read and write command (Registers)
* RPMB read and write
* SEJ AES (Encryption & Decryption with HW based crypto)
* Key derivation (RPMB & FDE)
