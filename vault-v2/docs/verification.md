# Verification record

This build passed strict TypeScript checking, a Vite production build, and 25 automated tests on Node.js 24.19.0.

The tests cover:

- Arabic browser-language defaults, saved preference, right-to-left document direction, live text/attribute changes, and safe literal parameter rendering.
- Language switching during an unsaved edit preserves draft and secret fields, leaves encrypted storage unchanged, and still clears secrets on lock.
- Translation parameter parity between English source messages and Arabic copy.
- Unicode, attachments, and password-history round trips.
- Wrong passwords and altered ciphertext.
- Bounded key-derivation parameters and authenticated header data.
- Importing a v1 envelope generated independently with Node crypto, including null platform icons.
- Plaintext import passphrase requirements and malformed schemas.
- Unsafe image sources and duplicate entry identities.
- Generator length constraints.
- Save ordering, immediate session locking, storage failure recovery, and retry.
- Passphrase changes and continued access to older snapshots with their old key.
- Theme persistence, live system-theme changes, and selected palette text contrast.
- Offline cache allowlisting, subpath handling, explicit update activation, rejection of auth redirects, and cache isolation.
- Mobile entry/back/menu navigation and safe update eligibility after locking.
- Per-deployment-path saved-vault isolation.
- Current/previous IndexedDB snapshot behavior using fake-indexeddb.
- Literal rendering of hostile-looking text, global search, cleared lock-screen DOM, persisted edits, and inactivity deadlines using jsdom.

The production localhost server was also checked for its response headers and static asset delivery.

These are not real-browser integration tests. jsdom does not enforce CSP, run layout, reproduce browser quota behavior, or establish accessibility. A browser binary could not be installed in the execution environment, so screenshot inspection, physical Samsung/iPhone/iPad testing, OS installation/share sheets, actual offline execution, clipboard permissions, Web Locks behavior, browser suspension, and real storage failure scenarios remain unverified. No user vault was supplied; compatibility checks use synthetic fixtures matching the old source's encryption format.

Before relying on this with real secrets, perform those browser checks and obtain independent security review. Use `npm test` and `npm run build` to reproduce the completed automated checks.
