# Architecture decisions

## Local storage before a backend

The requirement is one person managing a local vault with portable backups. A remote server would add authentication, authorization, database migrations, deployment, rate limiting, and API security without solving a required problem. A static app keeps the sensitive-data path small. The optional Python process serves the build; it is not a vault backend.

If synchronization becomes a requirement, design it separately. Clients should encrypt before upload. A server should only hold ciphertext, but client delivery and account authorization still need protection. A compromised server that serves malicious application JavaScript can steal secrets after an unlock, despite encrypted storage.

## TypeScript without a UI framework

The data model and module interfaces are explicit. Strict type checking catches inconsistent calls. Import validation remains necessary because TypeScript types disappear at runtime and cannot validate a JSON file.

The interface uses DOM nodes and `textContent`, avoiding HTML string interpolation for imported values. No runtime package is needed for this interface. `ui/app.ts` coordinates navigation and connects the session to dedicated authentication, entry editor, and detail screen modules. Avoid adding generalized repositories, dependency injection containers, or dozens of tiny wrappers until they solve a concrete problem.

## Web Crypto and versioned envelopes

V1 decryption is isolated in the importer with its original 250,000 PBKDF2 iterations. V2 uses PBKDF2-HMAC-SHA-256 at 600,000 iterations, a random 16-byte salt, AES-256-GCM, fresh 12-byte IVs per encryption, and a 128-bit authentication tag. The format name and canonical KDF header are authenticated as additional data. Derived keys are non-extractable.

PBKDF2 was selected because it is built into browsers and avoids a cryptographic WASM dependency for this release. It is not memory-hard. Argon2id through a vetted implementation is a future option requiring dependency review and device benchmarking. Never change the v1 reader's parameters when upgrading new files.

Passwords in a vault need reversible encryption: users must retrieve them. Authentication password hashing is a different use case. We do not store an additional fast master-password hash.

## Ordered, atomic persistence

Every mutation schedules encryption immediately. Encryption snapshots JSON synchronously before its first await. Disk writes are serialized, so a slower older operation cannot overwrite a newer snapshot. IndexedDB updates current and previous ciphertext in one transaction.

A failed disk save keeps an encrypted recovery envelope in memory. Lock drops references to the plaintext vault and key immediately while already-started saves finish. The UI removes fields and images. A failed encryption operation, browser crash, or process termination can still lose an unsaved change. A browser save is not an external backup.

Web Locks hold an exclusive application-instance lock for the origin, preventing two active tabs from racing over the single saved vault. Unsupported browsers fail closed instead of skipping coordination. Back-forward cache restores reload to reacquire the lock.

## Migration behavior

Validate first; never merge arbitrary JSON into application objects. Supported legacy fields are reconstructed into a fresh typed vault. Invalid records fail the import and leave the existing persisted vault unchanged. Files are not rewritten in place. Plaintext imports require a new passphrase; v1 imports preserve the existing password so they remain openable.

## Dependency and delivery boundaries

The lockfile captures development dependencies. `npm ci` reproduces installation; `npm run build` checks types and produces static assets. Ship the entire `dist` directory through a trusted HTTPS host or the localhost static server. Pin your deployment, review changes, and review dependency updates. Same-origin asset requests support a versioned, allowlisted offline app shell; the encrypted vault is not part of that cache. A CSP is defense in depth and does not establish that the delivered application is trustworthy.
