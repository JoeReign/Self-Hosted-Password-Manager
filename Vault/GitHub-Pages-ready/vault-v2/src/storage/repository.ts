import { readEnvelope, type Envelope } from '../crypto/vault-crypto';

export interface VaultRepository {
  load(previous?: boolean): Promise<Envelope | null>;
  save(envelope: Envelope): Promise<void>;
}

/** Both snapshots contain ciphertext only. A failed transaction changes neither. */
export class BrowserRepository implements VaultRepository {
  private database: Promise<IDBDatabase>;

  constructor(scope = '/') {
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(scope === '/' ? 'local-vault-v2' : `local-vault-v2:${scope}`, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Browser storage could not be opened.'));
      request.onblocked = () => reject(new Error('Close other Vault tabs and try again.'));
    });
  }

  async load(previous = false): Promise<Envelope | null> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('snapshots', 'readonly');
      const request = transaction.objectStore('snapshots').get(previous ? 'previous' : 'current');
      transaction.oncomplete = () => {
        try { resolve(request.result ? readEnvelope(request.result) : null); }
        catch (error) { reject(error); }
      };
      transaction.onabort = () => reject(new Error('Could not read the saved vault.'));
    });
  }

  async save(envelope: Envelope): Promise<void> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('snapshots', 'readwrite');
      const store = transaction.objectStore('snapshots');
      const existing = store.get('current');
      existing.onsuccess = () => {
        if (existing.result) store.put(existing.result, 'previous');
        store.put(envelope, 'current');
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error('Encrypted save failed. Export a backup before closing.'));
    });
  }
}
