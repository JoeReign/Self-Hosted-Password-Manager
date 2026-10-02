import { seal, type Envelope, type KeyContext } from '../crypto/vault-crypto';
import type { Vault } from '../vault/types';
import type { VaultRepository } from '../storage/repository';

export type SaveStatus = 'saving' | 'saved' | 'failed';

export class VaultSession {
  private vault: Vault | null = null;
  private context: KeyContext | null = null;
  private writes: Promise<void> = Promise.resolve();
  private revision = 0;
  private pending: Envelope | null = null;
  onStatus: (status: SaveStatus) => void = () => {};

  constructor(private repository: VaultRepository) {}

  open(vault: Vault, context: KeyContext): void {
    if (this.vault) throw new Error('Lock the current vault first.');
    this.vault = vault;
    this.context = context;
    this.pending = null;
  }

  replaceVault(vault: Vault): Promise<void> {
    this.current();
    this.vault = vault;
    return this.save();
  }

  changeKey(context: KeyContext): Promise<void> {
    this.current();
    this.context = context;
    return this.save();
  }

  current(): Vault {
    if (!this.vault) throw new Error('Vault is locked.');
    return this.vault;
  }

  save(): Promise<void> {
    if (!this.context) return Promise.reject(new Error('Vault is locked.'));
    // Encrypt immediately: queued writes must not hold references to mutable entries.
    const encrypted = seal(this.current(), this.context);
    // Attach rejection handling now, even if a prior write has not finished yet.
    const result = encrypted.then(envelope => ({ envelope }), error => ({ error }));
    const revision = ++this.revision;
    this.onStatus('saving');
    const write = this.writes.then(async () => {
      const outcome = await result;
      if ('error' in outcome) throw outcome.error;
      this.pending = outcome.envelope;
      await this.repository.save(outcome.envelope);
      this.pending = null;
      if (revision === this.revision) this.onStatus('saved');
    });
    this.writes = write.catch(() => {
      if (revision === this.revision) this.onStatus('failed');
    });
    return write;
  }

  async export(): Promise<Envelope> {
    if (!this.context) {
      if (this.pending) return this.pending;
      throw new Error('Unlock a vault to export it.');
    }
    return seal(this.current(), this.context);
  }

  /** Call after every mutation's save() has been scheduled. Clears references synchronously. */
  lock(): Promise<void> {
    this.vault = null;
    this.context = null;
    return this.writes;
  }
}
