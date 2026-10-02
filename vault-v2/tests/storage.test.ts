import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { BrowserRepository } from '../src/storage/repository';
import { deriveContext, seal } from '../src/crypto/vault-crypto';
import { emptyVault } from '../src/vault/types';

Object.assign(globalThis, { indexedDB });

test('browser repository atomically retains current and previous encrypted snapshots', async () => {
  const repository = new BrowserRepository();
  assert.equal(await repository.load(), null);
  const context = await deriveContext('long passphrase for repository tests');
  const first = await seal(emptyVault(), context);
  const second = await seal(emptyVault(), context);
  await repository.save(first);
  await repository.save(second);
  assert.deepEqual(await repository.load(), second);
  assert.deepEqual(await repository.load(true), first);
  const reopened = new BrowserRepository();
  assert.deepEqual(await reopened.load(), second);
});

test('different deployment paths keep separate saved vaults on a shared origin', async () => {
  const first = new BrowserRepository('/first/');
  const second = new BrowserRepository('/second/');
  const envelope = await seal(emptyVault(), await deriveContext('long passphrase for scoped storage'));
  await first.save(envelope);
  assert.deepEqual(await first.load(), envelope);
  assert.equal(await second.load(), null);
});
