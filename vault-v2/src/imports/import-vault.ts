import { deriveContext, readEnvelope, unseal, type KeyContext } from '../crypto/vault-crypto';
import { fromBase64 } from '../crypto/encoding';
import { MAX_FILE_BYTES, record, validateVault } from '../vault/validation';
import type { Vault } from '../vault/types';

export interface ImportedVault {
  vault: Vault;
  context: KeyContext;
  migrated: boolean;
}

export function parseVaultFile(text: string): unknown {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error('File exceeds 20 MB.');
  return JSON.parse(text);
}

/** This reader deliberately preserves v1's fixed parameters. */
async function decryptLegacy(input: Record<string, unknown>, password: string): Promise<unknown> {
  const salt = fromBase64(input.salt, 16);
  const iv = fromBase64(input.iv, 12);
  const ciphertext = fromBase64(input.data, MAX_FILE_BYTES);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) {
    throw new Error('Invalid legacy encryption parameters.');
  }
  const context = await deriveContext(password, {
    name: 'PBKDF2', hash: 'SHA-256', iterations: 250_000, salt: input.salt as string,
  });
  const buffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, context.key, ciphertext);
  const bytes = new Uint8Array(buffer);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } finally {
    bytes.fill(0);
  }
}

export async function importVault(value: unknown, password: string): Promise<ImportedVault> {
  const input = record(value, 'Vault file');
  if (input.format === 'local-vault-v2') {
    const envelope = readEnvelope(input);
    const context = await deriveContext(password, envelope.kdf);
    return { vault: validateVault(await unseal(envelope, context)), context, migrated: false };
  }
  if (input.format !== undefined && input.format !== 'local-vault-v1') {
    throw new Error('Unsupported vault format.');
  }
  const plaintext = input.format === 'local-vault-v1' ? await decryptLegacy(input, password) : input;
  const vault = validateVault(plaintext);
  if (input.format === undefined && password.length < 14) {
    throw new Error('Choose a master passphrase of at least 14 characters for plaintext imports.');
  }
  return { vault, context: await deriveContext(password), migrated: true };
}
