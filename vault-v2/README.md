# Local Vault

A local password vault with a browser interface, encrypted browser storage, and portable JSON backups. This is a modular successor to [JoeReign/Self-Hosted-Password-Manager](https://github.com/JoeReign/Self-Hosted-Password-Manager), with an importer for its `local-vault-v1` exports.

This release is a working development build, not an independently audited password manager. Use test credentials while reviewing it. No software stack or passing test suite establishes that a password manager is safe for high-value secrets.

## End-user access

Open the hosted HTTPS link and use **Install / help** to add Vault to your phone, tablet, or desktop. No terminal is needed for the hosted app. See [installation and GitHub hosting](docs/install.md).

Themes: Auto (system), Light, Dark, Cyberpunk, and the original Forest palette. Phone navigation uses a separate entry/detail view with a back button, a collapsible group menu, and larger touch targets. Tablet layouts retain side-by-side panels when space permits.

## Run the included build

Install Python 3, extract the complete folder, then run:

```sh
python scripts/serve.py
```

On Windows, `py scripts/serve.py` also works. Open http://127.0.0.1:8000. Keep the address consistent: `localhost`, `127.0.0.1`, and different ports have separate browser storage. Stop the local server with Ctrl+C.

The server only serves application files. It does not receive, store, or decrypt your vault. The production application permits same-origin application asset requests for installation and offline updates. It does not upload vault data.

## Develop

Requires Node.js 24 or newer:

```sh
npm ci
npm run dev
```

Run the checks and create a production build:

```sh
npm test
npm run build
```

`build` first runs TypeScript's strict type check. Tests use Node's test runner; a small loader transforms TypeScript test imports. Vite and the testing tools are development dependencies. The shipped application has no third-party JavaScript runtime dependencies.

Vite's development page permits injected styles and a local reload WebSocket. The production build does not allow injected styles or development WebSockets. Never use the development server with real credentials.

## Daily use

1. Create a vault with a long, unique master passphrase, or open an existing JSON file.
2. Add an account group and entries. Search matches all groups when you enter a query.
3. Changes are encrypted and saved in this browser. Watch the save status.
4. Export an encrypted backup regularly. Browser storage can be cleared, evicted, or lost with your profile.
5. Lock when finished. Inactivity also locks the vault after five minutes.
6. Next time, unlock the saved browser copy with the master passphrase.

Only one tab can use the saved vault at a time. Close it before opening another. Each deployment path within a browser origin stores one current vault plus one previous encrypted snapshot. Importing or creating another vault asks before replacing that copy. The original imported file is never modified.

The clipboard can retain copied secrets and may be synchronized by your OS. This release does not claim to erase clipboard history. Clear the clipboard when finished.

## Compatibility

Supported imports:

- Existing encrypted `local-vault-v1` JSON, using its original master password.
- Legacy plaintext JSON with a `vaults` array, protected with a new passphrase.
- New `local-vault-v2` JSON.

The importer preserves the known legacy fields: group names, entry IDs and names, usernames, passwords, URLs, notes, favorites, color tags, timestamps, password history, platform references, platform metadata, and supported embedded images. Old groups without IDs receive new random IDs. The original app's nullable platform icons are supported.

SVG, remote images, malformed fields, duplicate IDs, unsupported schema versions, and oversized files produce an error. Nothing is silently stripped from supported fields to bypass an error. Unknown extension fields are not part of the supported schema. File imports are limited to 20 MiB; embedded images to about 3 MiB of base64 each; upload controls accept 2 MiB files. Encryption caps plaintext below 15 MiB so its base64 envelope stays importable.

Imports are automatically encrypted into v2 browser storage. Exporting produces v2 files, which the old application cannot open. Compatibility here means the new application can read old data; it does not mean the old app can read new exports.

An old encrypted file may have a weak master password. Importing increases the derivation work but cannot make that password stronger. Use **Change master passphrase**, then export a new backup. Existing backups and the previous snapshot still use their previous passphrase.

## Code map

| Directory | Owns | Does not own |
| --- | --- | --- |
| `src/crypto` | Web Crypto operations, encoding, password generation | Rendering or browser storage |
| `src/vault` | Data model and validation | Encryption or persistence |
| `src/imports` | Format detection and legacy migration | UI or writes |
| `src/storage` | Atomic encrypted snapshot transactions | Passwords or plaintext |
| `src/session` | Unlocked state, key lifetime, ordered saves | DOM rendering |
| `src/ui` | Forms, navigation, safe DOM construction | Cryptographic algorithms |
| `src/preferences` | Appearance settings and system theme changes | Vault contents |
| `src/pwa` | Installation prompts and update coordination | Vault encryption |
| `src/platform` | Encrypted file download/share delivery | Storage transactions |
| `src/main.ts` | Startup and exclusive browser-tab coordination | Business logic |
| `tests` | Compatibility and failure behavior | Production features |

Read [the architecture guide](docs/architecture.md) for design decisions, [the security notes](docs/security.md) for the threat model, and [the walkthrough](docs/walkthrough.md) for the learning sequence.

The initial implementation was developed with AI assistance. Its quality should be assessed through reviewable decisions, readable source, reproducible checks, and independent security review. Maintainers are responsible for understanding and validating changes.

## Scope

Included: encrypted autosave, legacy imports, global search, groups, rename, entry editing and moving, favorites, password review, password generation, masked history, image uploads/viewing, passphrase changes, previous snapshot recovery, encrypted exports, inactivity locking, themes, install help, offline app files, and mobile navigation.

Not yet included: cloud sync, sharing, browser autofill, CSV import, undo, a platform library editor, attachment removal, password breach lookups, automatic device sync, or native app-store packages. Existing supported platform/attachment data remains in exports even where no editing UI exists.
