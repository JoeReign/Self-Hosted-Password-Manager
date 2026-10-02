# Security model and review limits

## Intended protection

The encrypted envelope is meant to protect data if someone obtains only an exported vault or the browser's stored ciphertext. AES-GCM rejects altered ciphertext. A passphrase-derived key makes offline guesses more expensive. This relies on a strong, unique passphrase.

## Outside the model

The application cannot protect an unlocked vault from a compromised operating system, hostile browser extension, injected application script, screen capture, or someone controlling the browser session. A non-extractable key prevents key export through Web Crypto; hostile same-page JavaScript can still use the key to decrypt. JavaScript cannot guarantee physical erasure of every string from memory.

The master password is not stored as session state. Password inputs are cleared after derivation. UTF-8 byte buffers are overwritten where practical. Plaintext and key references are discarded on lock, and the unlocked DOM is removed. Do not call this a guarantee against memory forensics.

Clipboard history, OS clipboard sync, downloaded files, browser profile backups, and device-level permissions need separate handling. There is no password recovery or hidden bypass.

## Input boundaries

All imported plaintext is treated as untrusted. Validation bounds work parameters, salt/IV lengths, ciphertext size, text lengths, record counts, and supported images. Rendering uses text nodes and property assignments. SVG and arbitrary remote image URLs are rejected. The production CSP disallows off-origin network connections, inline scripts, objects, forms, and remote resources. Same-origin requests are permitted for application files and offline updates. The provided static server also prohibits framing through a response header.

## Storage and recovery

IndexedDB contains encrypted current/previous envelopes only. Browser storage is origin-specific and can disappear. Each import replaces the current browser vault only after confirmation, but the previous snapshot is only one transaction old; a later edit will overwrite it. Export before switching vaults. A change of passphrase does not reencrypt old files or necessarily erase historical disk copies.

Encryption uses fresh random IVs on every save. If disk persistence fails after encryption, the pending encrypted snapshot can be downloaded. Encryption failure cannot guarantee a usable recovery envelope. Do not close the page while saving or after an error without exporting a successful backup.

## Required review before real-secret use

Review the threat model and key lifecycle independently. Benchmark key derivation and large vaults on supported devices. Exercise browser quota/storage failures, background-tab suspension, navigation, and tab races in real browsers. Audit the deployed build, headers, update process, dependency supply chain, and accessibility. Test recovery from external backups rather than assuming a downloaded file works.

This project has not received an independent security audit. Do not describe it as audited, production-hardened, zero-trust certified, or guaranteed safe.

## Installed web app

The service worker allowlists exact static app assets and scopes its cache to its deployment path. Vault ciphertext remains in IndexedDB; plaintext never enters the app-shell cache. Updates wait for explicit activation while the vault is locked and saved. These controls do not protect against a malicious update served by a compromised host. Trust and audit the host's deployed source and update process.

Installation is not synchronization. Browser storage and installed-app storage can differ. Keep external encrypted backups and test restoration on every device.
