import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveContext, unseal, type Envelope } from '../src/crypto/vault-crypto';
import { VaultSession } from '../src/session/session';
import { emptyEntry, emptyVault, type Vault } from '../src/vault/types';
import type { VaultRepository } from '../src/storage/repository';

class MemoryRepository implements VaultRepository {
  envelopes: Envelope[] = [];
  fail = false;
  async load() { return this.envelopes.at(-1) ?? null; }
  async save(envelope: Envelope) {
    if (this.fail) throw new Error('Disk full');
    this.envelopes.push(structuredClone(envelope));
  }
}

test('serial saves preserve mutation order even when encryption overlaps; lock immediately rejects reads', async () => {
  const repository = new MemoryRepository();
  const session = new VaultSession(repository);
  const context = await deriveContext('a long and unique passphrase');
  const vault = emptyVault();
  vault.vaults[0]!.entries.push(emptyEntry());
  session.open(vault, context);
  vault.vaults[0]!.entries[0]!.app = 'First edit';
  const first = session.save();
  vault.vaults[0]!.entries[0]!.app = 'Second edit';
  const second = session.save();
  const locked = session.lock();
  assert.throws(() => session.current(), /locked/);
  await Promise.all([first, second, locked]);
  assert.equal(repository.envelopes.length, 2);
  assert.equal((await unseal(repository.envelopes[0]!, context) as Vault).vaults[0]!.entries[0]!.app, 'First edit');
  assert.equal((await unseal(repository.envelopes[1]!, context) as Vault).vaults[0]!.entries[0]!.app, 'Second edit');
  assert.equal(JSON.stringify(repository.envelopes).includes('Second edit'), false);
});

test('failed saves retain only an encrypted recovery export after locking', async () => {
  const repository = new MemoryRepository();
  repository.fail = true;
  const session = new VaultSession(repository);
  const context = await deriveContext('a long and unique passphrase');
  session.open(emptyVault(), context);
  await assert.rejects(session.save(), /Disk full/);
  await session.lock();
  const recovery = await session.export();
  assert.equal(recovery.format, 'local-vault-v2');
  assert.equal(repository.envelopes.length, 0);
  assert.throws(() => session.current());
});

test('save queue remains usable after a storage failure', async () => {
  const repository = new MemoryRepository();
  const session = new VaultSession(repository);
  session.open(emptyVault(), await deriveContext('a long and unique passphrase'));
  repository.fail = true;
  await assert.rejects(session.save());
  repository.fail = false;
  await session.save();
  assert.equal(repository.envelopes.length, 1);
});

test('changing the passphrase writes a new key while old snapshots retain their original key', async () => {
  const repository = new MemoryRepository();
  const session = new VaultSession(repository);
  const oldContext = await deriveContext('the old long master passphrase');
  const newContext = await deriveContext('the new long master passphrase');
  session.open(emptyVault(), oldContext);
  await session.save();
  await session.changeKey(newContext);
  assert.ok(await unseal(repository.envelopes[0]!, oldContext));
  assert.ok(await unseal(repository.envelopes[1]!, newContext));
  await assert.rejects(unseal(repository.envelopes[1]!, oldContext));
});
