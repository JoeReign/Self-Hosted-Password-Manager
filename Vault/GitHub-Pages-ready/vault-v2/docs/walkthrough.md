# Learning the code

## 1. Start with the data

Read `src/vault/types.ts`. A vault contains account groups. Each group contains entries. An entry holds a username, password, notes, images, and history. This is plaintext while the app is unlocked.

Read `validation.ts` next. A JSON file is just unknown data. Checking its shape and constructing fresh objects prevents malformed imports from becoming application state. A TypeScript interface alone cannot do this.

## 2. Follow one unlock

The UI reads a file and asks `imports/import-vault.ts` to open it. The importer recognizes its version. For an encrypted file, it derives a key from the passphrase and salt, then asks the browser to decrypt. GCM verifies the authentication tag; a wrong password or changed file fails authentication. The result is validated before it enters the session.

The salt is public, random data that ensures the same passphrase produces different keys in different vaults. It is not the password. PBKDF2 deliberately repeats work so guessing passwords is slower. Its iteration count belongs to the file version, which is why v1 uses exactly its original settings.

## 3. Follow one edit

The entry form creates a draft, keeping the original entry intact until validation succeeds. If the password changes, the old value is added to history. The draft becomes part of the vault, and `session.save()` starts encryption.

AES-GCM uses the session key and a fresh IV. The IV must never be reused with the same key. The result is an envelope containing encryption parameters and ciphertext. The storage module only receives that encrypted envelope; it does not receive a password, key, or plaintext entry.

## 4. Follow one save failure

Two quick edits may finish encryption at different times. The session keeps storage writes in edit order. IndexedDB atomically moves the former current ciphertext into the previous slot and writes the new ciphertext into current. If that transaction fails, the session reports an error and keeps the encrypted envelope for recovery.

Study `tests/session.test.ts`: this is where ordering and disk-failure behavior are checked without needing a browser database.

## 5. Follow a lock

The UI clears password fields, secret displays, and image sources, then detaches the unlocked screen. The session discards its vault and key references. Already-started saves can finish with their temporary cryptographic inputs; future reads of the session fail.

This reduces exposure. It does not promise that a JavaScript engine has physically overwritten every previous string in RAM.

## 6. Read the compatibility test

`tests/crypto.test.ts` creates a v1 file independently using Node's crypto implementation, including its authentication tag. The importer must open that file using the original settings and preserve its records. This is stronger than having an exporter and importer share the same mistake and pass their own round-trip test.

Understand these paths before adding features. For each change, ask: where does plaintext exist, when does a key exist, what gets written to disk, and what happens if an awaited operation fails?
