import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { deriveContext, readEnvelope, seal, unseal } from '../src/crypto/vault-crypto';
import { importVault, parseVaultFile } from '../src/imports/import-vault';
import { emptyEntry, emptyVault } from '../src/vault/types';
import { validateVault } from '../src/vault/validation';
import { generatePassword } from '../src/crypto/passwords';

const passphrase = 'four words for a master passphrase';

test('v2 round trip preserves Unicode, attachments, and history; keys are non-extractable', async () => {
  const vault = emptyVault();
  const entry = emptyEntry();
  Object.assign(entry, { app: 'حساب', pass: '🔒secret', notes: 'Line one\nLine two',
    passHistory: [{ pass: 'old secret', date: 123 }],
    images: [{ id: 'image', dataUrl: 'data:image/png;base64,aGVsbG8=' }] });
  vault.vaults[0]!.entries.push(entry);
  const context = await deriveContext(passphrase);
  assert.equal(context.key.extractable, false);
  const first = await seal(vault, context);
  const second = await seal(vault, context);
  assert.notEqual(first.cipher.iv, second.cipher.iv);
  assert.deepEqual(await unseal(first, context), vault);
  assert.deepEqual((await importVault(first, passphrase)).vault, vault);
});

test('wrong password and modified ciphertext cannot unlock a vault', async () => {
  const context = await deriveContext(passphrase);
  const envelope = await seal(emptyVault(), context);
  await assert.rejects(importVault(envelope, 'a wrong passphrase'));
  const bytes = Buffer.from(envelope.data, 'base64');
  bytes[0] = bytes[0]! ^ 1;
  await assert.rejects(importVault({ ...envelope, data: bytes.toString('base64') }, passphrase));
});

test('v2 rejects unbounded KDF work and authenticates header parameters', async () => {
  const context = await deriveContext(passphrase);
  const envelope = await seal(emptyVault(), context);
  assert.throws(() => readEnvelope({ ...envelope, kdf: { ...envelope.kdf, iterations: 1e12 } }));
  await assert.rejects(unseal({ ...envelope, kdf: { ...envelope.kdf, iterations: 600001 } }, context));
});

test('opens a v1 file produced independently with Node crypto and migrates all legacy fields', async () => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const legacy = {
    vaults: [{ name: 'Personal', entries: [{
      ...emptyEntry(), app: 'Legacy account', pass: 'original password', favorite: true,
      colorTag: 'purple', platformId: 'platform', modifiedAt: 12345,
      passHistory: [{ pass: 'older password', date: 100 }],
      images: [{ id: 'attachment', dataUrl: 'data:image/png;base64,aGVsbG8=' }],
    }] }],
    platforms: [{ id: 'platform', name: 'Platform', icon: 'data:image/png;base64,aGVsbG8=' },
      { id: 'no-icon', name: 'Platform without icon', icon: null }],
  };
  const cipher = createCipheriv('aes-256-gcm', pbkdf2Sync(passphrase, salt, 250000, 32, 'sha256'), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(legacy), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  const file = { format: 'local-vault-v1', salt: salt.toString('base64'), iv: iv.toString('base64'), data: ciphertext.toString('base64') };
  const imported = await importVault(file, passphrase);
  assert.equal(imported.migrated, true);
  assert.equal(imported.context.parameters.iterations, 600000);
  assert.deepEqual(imported.vault.vaults[0]!.entries, legacy.vaults[0]!.entries);
  assert.deepEqual(imported.vault.platforms, legacy.platforms);
  assert.equal(imported.vault.vaults[0]!.name, 'Personal');
  assert.equal(file.format, 'local-vault-v1');
});

test('plain legacy imports require a new long passphrase; bad schemas fail visibly', async () => {
  const legacy = { vaults: [{ name: 'Old group', entries: [] }] };
  await assert.rejects(importVault(legacy, 'short'));
  assert.equal((await importVault(legacy, passphrase)).vault.vaults[0]!.name, 'Old group');
  assert.throws(() => validateVault({ vaults: [{ name: 123 }] }));
  assert.throws(() => validateVault({ ...emptyVault(), schemaVersion: 99 }));
  assert.throws(() => parseVaultFile('not json'));
});

test('rejects unsafe image sources and duplicate entry identities', () => {
  const vault = emptyVault();
  vault.platforms.push({ id: 'icon', name: 'Unsafe', icon: 'x" onerror="alert(1)' });
  assert.throws(() => validateVault(vault), /Images/);
  vault.platforms[0]!.icon = 'https://tracker.invalid/icon.png';
  assert.throws(() => validateVault(vault), /Images/);
  vault.platforms[0]!.icon = 'data:image/svg+xml;base64,PHN2Zz4=';
  assert.throws(() => validateVault(vault), /Images/);
  vault.platforms = [];
  const entry = emptyEntry();
  vault.vaults[0]!.entries = [entry, { ...entry }];
  assert.throws(() => validateVault(vault), /Duplicate/);
});

test('generator produces configurable passwords and rejects unsafe lengths', () => {
  assert.equal(generatePassword().length, 24);
  assert.equal(generatePassword(64).length, 64);
  assert.throws(() => generatePassword(4));
  assert.throws(() => generatePassword(100000));
});
