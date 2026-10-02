import { fromBase64, toBase64 } from './encoding';
import { MAX_FILE_BYTES, MAX_PLAINTEXT_BYTES, record } from '../vault/validation';
import type { Vault } from '../vault/types';

export const NEW_ITERATIONS = 600_000;
export interface KeyParameters {
  name: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string;
}
export interface Envelope {
  format: 'local-vault-v2';
  kdf: KeyParameters;
  cipher: { name: 'AES-GCM'; iv: string; tagLength: 128 };
  data: string;
}
export interface KeyContext {
  key: CryptoKey;
  parameters: KeyParameters;
}

export async function deriveContext(password: string, parameters?: KeyParameters): Promise<KeyContext> {
  const kdf = parameters ?? {
    name: 'PBKDF2', hash: 'SHA-256', iterations: NEW_ITERATIONS,
    salt: toBase64(crypto.getRandomValues(new Uint8Array(16))),
  };
  const bytes = new TextEncoder().encode(password);
  try {
    const material = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({
      name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(kdf.salt, 16), iterations: kdf.iterations,
    }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return { key, parameters: kdf };
  } finally {
    bytes.fill(0);
  }
}

export function readEnvelope(value: unknown): Envelope {
  const input = record(value, 'Encrypted vault');
  if (input.format !== 'local-vault-v2') throw new Error('Unsupported encrypted vault format.');
  const kdf = record(input.kdf, 'Key derivation');
  const cipher = record(input.cipher, 'Cipher');
  if (kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' ||
      typeof kdf.iterations !== 'number' || !Number.isInteger(kdf.iterations) ||
      kdf.iterations < NEW_ITERATIONS || kdf.iterations > 2_000_000 ||
      fromBase64(kdf.salt, 16).length !== 16 ||
      cipher.name !== 'AES-GCM' || cipher.tagLength !== 128 ||
      fromBase64(cipher.iv, 12).length !== 12 ||
      fromBase64(input.data, MAX_FILE_BYTES).length < 16) {
    throw new Error('Invalid encryption parameters.');
  }
  return {
    format: 'local-vault-v2',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: kdf.iterations, salt: kdf.salt as string },
    cipher: { name: 'AES-GCM', iv: cipher.iv as string, tagLength: 128 },
    data: input.data as string,
  };
}

function header(kdf: KeyParameters): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify({ format: 'local-vault-v2', kdf }));
}

export async function seal(vault: Vault, context: KeyContext): Promise<Envelope> {
  const plaintext = new TextEncoder().encode(JSON.stringify(vault));
  try {
    if (plaintext.length > MAX_PLAINTEXT_BYTES) throw new Error('Vault exceeds the supported size.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({
      name: 'AES-GCM', iv, tagLength: 128, additionalData: header(context.parameters),
    }, context.key, plaintext);
    return {
      format: 'local-vault-v2', kdf: { ...context.parameters },
      cipher: { name: 'AES-GCM', iv: toBase64(iv), tagLength: 128 },
      data: toBase64(new Uint8Array(data)),
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function unseal(envelope: Envelope, context: KeyContext): Promise<unknown> {
  const buffer = await crypto.subtle.decrypt({
    name: 'AES-GCM', iv: fromBase64(envelope.cipher.iv, 12), tagLength: 128,
    additionalData: header(envelope.kdf),
  }, context.key, fromBase64(envelope.data, MAX_FILE_BYTES));
  const bytes = new Uint8Array(buffer);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } finally {
    bytes.fill(0);
  }
}
