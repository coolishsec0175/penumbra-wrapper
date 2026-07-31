## Frequently asked questions (FAQ)

### What's the difference between Penumbra and Antumbra?

[[Penumbra]] is a Rust crate (library) for interacting with MediaTek devices.
It's useful for developers who want to use it on their own applications.
It's like a backend.

[[Antumbra]] is a CLI and TUI written in Rust, and used [[Penumbra]] as its backend.
It's like a frontend.

### I get error 0x7017 / 0x7024 on my device when trying to upload DA1

This means your device has DAA on!
DAA (Download Agent Authorization) is a security mechanism in MediaTek devices that stops users from loading "unauthorized" [[Download Agent|DAs]].
This means that you can only load the official DA provided by your device manufacturer.

Some OEMs might invalidate DAs that used to work on the same device after an update, in which case you'll either need to get a new DA or if possible downgrade the preloader.

Error 0x7024 (usually a preloader error) means that the DA file you provided didn't failed the signature verification.

Error 0x7017 is usually a BROM error (or Preloader too on some devices like OnePlus), meaning that you need to provide an Auth file.

### What if I instead get error "SendDA command failed with status: 1D0D"

This means your device also has SLA on!

Unfortunately for you, this means you're in BROM and you'll need to get auth from paid tools, or hope for future exploits.

### I get an error about DA SLA, what should I do?

If you get an error like "DA SLA signature rejected (dummy), can't proceed!", it means your DA implements DA SLA, a security mesaure like BROM SLA, where a challenge is signed by the host and the DA verifies it.
This is to ensure only authorized hosts can perform operations on the device.

Unfortunately, you'll need paid auth too for this.

### My device is not being detected

If you're on Linux, try setting up your udev rules and running as sudo.

If you're on Windows, you'll need ot fight with your OS a bit more, and install the proper driver. Generally, it is suggested to use WinUSB with the default USB backend, or LibUSB with the libusb backend (which is what antumbra windows releases use). For that, I suggest using [Zadig](https://zadig.akeo.ie/).

### Where can I ask questions?

For asking questions, check the [discussions section](https://github.com/shomykohai/penumbra/discussions) on Penumbra repo.
