# Self-Hosted Password Manager

A single-file, self-hosted password vault. No server, no database, no account — just an HTML file that runs entirely in your browser.

## How it works

- Everything is stored **client-side**, encrypted with **AES-256-GCM** (key derived via PBKDF2, 250,000 iterations)
- You set a **master password** — there is no reset, no backdoor, and nothing is sent over the network
- Your data lives in an exported `.json` file that *you* control (save it to Drive, USB, wherever) — the app has no server component to hack or lose

## Getting started

1. Download `Vault/Vault.html`
2. Open it in any browser (double-click, or host it via GitHub Pages for access from any device)
3. First time: set a master password to create your vault
4. Add entries, organized into tabs (one per account/email)
5. Click **Export encrypted (.json)** and save that file somewhere you control
6. Next time: choose **Open existing**, select your exported file, and unlock with your master password

## Current limitations

- **Single-user only.** Everyone who has the exported file and master password has full read/write access — there's currently no way to give someone "read-only" access without also giving them edit rights. A real admin/read-only split would need an actual backend with per-user accounts, which this project doesn't have yet.
- Nothing auto-saves — you must export after making changes, or edits are lost when you close the tab.
- Icons for platforms are optional; if you skip uploading one, entries just show as plain text.

## Why self-hosted

No cloud service, no subscription, no third party holding your vault. If you lose the exported file and forget the master password, though, the data is genuinely unrecoverable — that trade-off is what makes the encryption real.
