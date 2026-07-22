# 🔐 Vault — Local-First Password Manager

> AES-256 encrypted. Entirely in your browser. Nothing leaves your device unless you export it.

Vault is a zero-trust, client-side password manager that runs entirely in a single HTML file. No servers, no accounts, no tracking — just strong encryption and your data.

---

## ✨ Features

### 🔒 Security & Encryption
- **AES-256-GCM encryption** with PBKDF2 key derivation (250,000 iterations)
- **Unique salt & IV** generated per vault for maximum entropy
- **No server communication** — everything happens inside your browser
- **Clipboard auto-clear** — copied passwords are wiped from clipboard after 30 seconds
- **Auto-lock** — vault locks after configurable inactivity period
- **No password reset** — if you forget your master password, your data is mathematically unrecoverable

### 📂 Vault Organization
- **Multiple vaults/tabs** — organize passwords by email account, client, or category
- **Drag-and-drop reordering** — rearrange entries by dragging the handle (⋮⋮)
- **Search** — instant search across app names, usernames, notes, and URLs (`Ctrl+K`)
- **Favorites** — star important entries for quick access
- **Color tags** — red, green, blue, yellow, purple for visual grouping

### 🎮 Platform Icons
- **Platform picker** — assign icons to entries (Discord, Gmail, Netflix, etc.)
- **Custom platforms** — add your own platforms with uploaded icons (PNG/JPG/SVG)
- **Editable platform library** — manage your platform list over time

### 📝 Entry Management
- **Add / Edit / Delete** entries with undo support
- **Password generator** — cryptographically secure random passwords
- **Password strength meter** — visual feedback on password quality
- **Password history** — last 5 passwords kept per entry when changed
- **Image attachments** — store recovery codes, QR codes, 2FA backups
- **Lightbox viewer** — click images to view full-size with thumbnail strip
- **Last modified** timestamps on every entry
- **Empty field warnings** — highlights missing passwords, usernames, or URLs

### 🔍 Insights & Diagnostics
- **Duplicate password detection** — warns when the same password is reused across entries
- **Security dashboard** — overall security score, weak password count, reuse stats
- **Diagnostics log** — tracks errors, warnings, and events for troubleshooting
- **Vault size indicator** — see how large your encrypted vault is

### 🎨 UI & Customization
- **Dark & Light themes** — toggle anytime, preference persists
- **Compact view** — denser table layout for power users
- **Keyboard shortcuts** — `Ctrl+K` to search, `Escape` to close modals

### 📤 Import / Export
- **Export encrypted** — saves as `vault-data.enc.json` (AES-256)
- **Import encrypted** — load your vault on any device with the file + password
- **Import legacy JSON** — migrate from older unencrypted vault formats
- **Import CSV** — bulk import from password managers (supports standard CSV columns: name, url, username, password, notes)
- **Printable backup** — generates a printer-friendly backup sheet

---

## 🚀 Quick Start

### Option 1: Open the File Directly
1. Download `Vault.html`
2. Double-click to open in your browser (Chrome, Firefox, Edge recommended)
3. Click **"New vault"** tab
4. Set a strong master password
5. Start adding entries

### Option 2: Host for Mobile Access
Upload `Vault.html` to any static hosting (GitHub Pages, Netlify, Vercel, Cloudflare Pages) to access your vault from any device with a browser.

> ⚠️ **Important**: If opened via `file://` protocol, some browsers may restrict Web Crypto API. For full functionality, host via HTTPS or use Chrome/Firefox locally.

---

## 📖 End-to-End Workflow

### 1. Create Your First Vault
```
Open Vault.html → "New vault" tab
├── Import old data (optional)
├── Set master password
├── Confirm master password
└── Click "Create vault"
```
Your vault starts with two default account tabs. You can rename these by deleting and recreating, or just use them as-is.

### 2. Add an Account Tab
```
Click "+ Add account (tab)" in sidebar
└── Enter name (e.g., "work@company.com")
```

### 3. Add an Entry
```
Click "+ Add entry"
├── "What platform?" picker appears
│   ├── Search existing platforms
│   ├── Click a platform (e.g., Discord)
│   └── Or click "+ Add new platform" to upload a custom icon
├── Continue to entry form
│   ├── App / Website name (auto-filled from platform)
│   ├── Website URL
│   ├── Username / Login
│   ├── Password (or click "Generate")
│   ├── Tag Color (optional)
│   ├── Notes (recovery codes, 2FA, etc.)
│   └── Images (drag & drop or click to upload)
└── Click "Save"
```

### 4. Daily Use
| Action | How |
|--------|-----|
| Search | `Ctrl+K` or click search box |
| Copy password | Click ⧉ next to password |
| Copy username | Click ⧉ next to username |
| Show password | Click 👁 |
| Edit entry | Click ✎ |
| Delete entry | Click 🗑 (5-second undo available) |
| Favorite | Click ☆/★ |
| View images | Click 🖼 indicator |
| Reorder | Drag ⋮⋮ handle up/down |

### 5. Save Your Vault (Export)
```
Click "Export encrypted (.json)" in sidebar
└── File downloads: vault-data.enc.json
```

**Store this file securely:**
- Google Drive / Dropbox / iCloud (encrypted at rest)
- USB drive
- Email to yourself

> 🔑 **You need BOTH the `.enc.json` file AND your master password** to unlock. Keep them separate for security.

### 6. Reopen Your Vault
```
Open Vault.html → "Open existing" tab
├── Choose your vault-data.enc.json file
├── Enter master password
└── Click "Unlock"
```

### 7. Lock When Done
```
Click 🔒 in top-right of sidebar
└── Confirm lock (or wait for auto-lock)
```

---

## 📋 CSV Import Format

Bulk import from other password managers using CSV:

```csv
name,url,username,password,notes
Discord,https://discord.com,john_doe,MyP@ssw0rd!,2FA enabled
Gmail,https://gmail.com,john@gmail.com,SecurePass123,Recovery: 555-0199
```

**Supported column names:**
- App name: `name`, `title`, `app`
- URL: `url`, `login_url`, `uri`
- Username: `username`, `login`, `user`
- Password: `password`, `pass`, `passwd`
- Notes: `notes`, `note`, `extra`

---

**Workflow:**
1. Admin manages vault in `vault-admin.html`
2. Admin exports `.enc.json` to shared storage (Google Drive)
3. Employees open `vault-employee.html`, upload the same file, enter password
4. Employees can view, search, and copy credentials — but cannot edit, export, or print

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────┐
│           Your Browser              │
│  ┌─────────────────────────────┐    │
│  │  Vault.html (single file)   │    │
│  │  ┌─────────────────────┐   │    │
│  │  │  Web Crypto API      │   │    │
│  │  │  ├── PBKDF2 (250k)   │   │    │
│  │  │  ├── AES-256-GCM     │   │    │
│  │  │  └── Random Salt+IV  │   │    │
│  │  └─────────────────────┘   │    │
│  │  ┌─────────────────────┐   │    │
│  │  │  Memory-only state  │   │    │
│  │  │  (never persisted)  │   │    │
│  │  └─────────────────────┘   │    │
│  └─────────────────────────────┘    │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐     │
│  │  vault-data.enc.json      │     │
│  │  (your exported file)     │     │
│  └─────────────────────────────┘     │
└─────────────────────────────────────┘
              │
              ▼
    Google Drive / USB / Email
```

- **No network requests** are made by the app
- **No analytics, no tracking, no cookies**
- **Memory-only** — data lives in RAM while unlocked, gone on page close
- **Encrypted at rest** — exported `.enc.json` is useless without the password

---

## ⚠️ Important Warnings

1. **No password recovery** — If you forget your master password, your data is lost forever. There is no backdoor.
2. **Back up regularly** — Export your `.enc.json` after making changes. The HTML file does not auto-save.
3. **Keep file + password separate** — Anyone with both can decrypt your vault.
4. **Clipboard clearing** — We attempt to clear the clipboard after 30s, but browsers may restrict this. Manually clear sensitive data when done.
5. **Browser compatibility** — Requires a modern browser with Web Crypto API support (Chrome 37+, Firefox 34+, Safari 7+, Edge 12+).

---

## 🛠️ Development

This is a single-file application. No build step, no dependencies, no npm.

```bash
# Just open the file
open Vault.html

# Or serve locally for testing
python3 -m http.server 8000
# Then open http://localhost:8000/Vault.html
```

---

## 📄 Files

| File | Description |
|------|-------------|
| `Vault.html` | **Personal Vault** — full-featured password manager with platform icons |


---

## 📜 License

MIT — Use freely, modify, distribute. No warranty implied. You are responsible for your own data security.

---

> *"The only password manager you can fully audit by reading one HTML file."*
*"Still improving it"*
