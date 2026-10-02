# Self-Hosted Password Manager

A local-first password vault with browser-side encryption, portable JSON backups, and an installable web interface for desktop, phones, and tablets.

**GitHub Pages address:** [joereign.github.io/Self-Hosted-Password-Manager](https://joereign.github.io/Self-Hosted-Password-Manager/)

The link becomes available after the repository's GitHub Pages deployment succeeds. The new application is in `vault-v2/`; the original single-file application remains in `Vault/Vault.html`.

## Use the app

1. Open the GitHub Pages link after publication.
2. Create a vault with a long, unique master passphrase, or import your existing JSON file.
3. Add entries and organize them into account groups.
4. Watch the save status: changes are encrypted and saved on your device.
5. Export an encrypted backup regularly and lock the vault when finished.

End users do not need a terminal, Python, Node.js, or a GitHub account to use the publicly hosted app. There is no master-password reset.

## Install on a device

| Device | Installation |
| --- | --- |
| Samsung / Android | Open in Chrome or Samsung Internet. Use **Install app**, or the browser menu's **Install app / Add to Home screen** option. |
| iPhone / iPad | Open in Safari → **Share → Add to Home Screen**. Enable **Open as Web App** if shown. |
| Desktop | Use Chrome or Edge's install option; supported Safari versions on macOS offer **Add to Dock**. |

The app's **Install / help** button includes these instructions. Installation is optional: the browser version works too. Wait for **Ready for offline use** before relying on offline access. Offline availability depends on the browser retaining its saved app files and storage.

## Features

- **Light, Dark, Auto, Cyberpunk, and Forest themes.** Auto follows the operating system. Cyberpunk uses midnight backgrounds and pink/purple accents.
- **Phone and tablet layouts.** Larger touch targets, collapsible navigation, and separate entry/detail screens on phones.
- **Encrypted autosave and backups.** A current and previous encrypted browser snapshot, plus portable encrypted JSON exports.
- **Legacy JSON imports.** Reads the original application's encrypted `local-vault-v1` files and supported plaintext JSON.
- **Global search, groups, favorites, and password review.** Search spans groups; review flags missing, short, or reused passwords.
- **Entry editing, password generation, history, and image attachments.** Existing supported platform metadata is preserved in exports.
- **Master-passphrase changes and inactivity locking.** The vault locks after five minutes of inactivity.
- **Installable offline app shell.** App updates wait until the vault is saved and locked.

## Encryption and storage

New vaults use AES-256-GCM with a 128-bit authentication tag, PBKDF2-HMAC-SHA-256 at 600,000 iterations, a random salt, and a fresh IV for each encryption. Keys are non-extractable Web Crypto keys. The old-format reader retains the original 250,000 iterations so existing files remain readable.

Vault data is not uploaded to GitHub or a vault server. Each visitor's encrypted vault is saved in their own browser storage. Same-origin requests fetch application files and offline updates. The service worker caches only allowlisted app assets; vault contents are not part of that cache.

Different devices do not automatically synchronize. To move a vault, export encrypted JSON, transfer the file, and import it on the next device using its master passphrase. An installed app and a browser tab may have separate storage. Moving to a different website address also creates a separate storage location, so export before switching.

Browser storage can be cleared or lost. Keep external encrypted backups and verify that they reopen. Copied passwords may remain in OS clipboard history.

## JSON compatibility

The new app opens:

- `local-vault-v1` encrypted exports with the existing master password.
- Supported legacy plaintext JSON with a new master passphrase.
- `local-vault-v2` exports.

Known legacy fields are preserved: account groups, entries, usernames, passwords, notes, URLs, favorites, tags, timestamps, password history, platform metadata, and supported embedded images. Nullable platform icons are supported.

SVG and remote images, malformed records, duplicate IDs, unsupported versions, and oversized files produce an import error. Supported embedded images are PNG, JPEG, GIF, and WebP. New exports use v2 and cannot be opened by the old application. Original imported files are not modified.

## Project structure

| Path | Purpose |
| --- | --- |
| `.github/workflows/pages.yml` | GitHub Pages build, test, and deployment workflow |
| `vault-v2/src/crypto/` | Key derivation, encryption, encoding, and password generation |
| `vault-v2/src/vault/` | Data types and runtime validation |
| `vault-v2/src/imports/` | Legacy format detection and migration |
| `vault-v2/src/storage/` | Atomic encrypted snapshots |
| `vault-v2/src/session/` | Key lifetime, unlocked state, and ordered saves |
| `vault-v2/src/ui/` | Authentication, entry screens, controls, and navigation |
| `vault-v2/src/preferences/` | Theme preferences and system-theme changes |
| `vault-v2/src/pwa/` | Installation and app-update coordination |
| `vault-v2/src/platform/` | Encrypted file download/share delivery |
| `vault-v2/tests/` | Compatibility, security-boundary, persistence, and UI tests |
| `Vault/Vault.html` | Original single-file application |

## Development

Requires Node.js 24 or newer. From the repository root:

```sh
cd vault-v2
npm ci
npm run dev
```

To verify and build:

```sh
npm test
npm run build
```

The application has no third-party JavaScript runtime dependencies. Vite, TypeScript, and test dependencies are development tools. The lockfile is committed for reproducible installs.

## Documentation and review status

- [Architecture decisions](vault-v2/docs/architecture.md)
- [Security model](vault-v2/docs/security.md)
- [Code walkthrough](vault-v2/docs/walkthrough.md)
- [Installation](vault-v2/docs/install.md)
- [Verification record](vault-v2/docs/verification.md)

The build passes strict TypeScript checking and 25 automated tests. DOM and service-worker tests use simulated environments. Physical Samsung/iPhone/iPad testing, real-browser offline/install checks, and independent security review remain outstanding. This is a development release, not an audited password manager; use sample credentials while reviewing it.

The initial v2 implementation used AI assistance. Changes should be judged through readable source, explainable decisions, reproducible checks, and independent review.

## Arabic and app icon update

Use **Language / اللغة** in the app header to switch between English and Arabic. Arabic uses a right-to-left layout. The choice stays on this device; language switching preserves draft fields and never translates imported account data or changes the JSON format. With no saved choice, Arabic browsers start in Arabic.

A new purple/pink vault-lock icon is supplied for Android, iPhone/iPad, desktop installations and the browser tab. The automated suite now has 25 passing tests; real-device layout and installation remain to be checked.
