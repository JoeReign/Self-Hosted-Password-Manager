import type { Entry, Vault } from './types';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_PLAINTEXT_BYTES = Math.floor((MAX_FILE_BYTES - 4096) * 3 / 4) - 16;
const MAX_ITEMS = 10_000;

export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, fallback = '', max = 100_000): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > max) {
    throw new Error(`${label} must be text within the size limit.`);
  }
  return value;
}

function list(value: unknown, label: string, max = MAX_ITEMS): unknown[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new Error(`${label} must be a list with at most ${max} items.`);
  }
  return value;
}

function timestamp(value: unknown): number {
  if (value === undefined) return Date.now();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Invalid timestamp.');
  }
  return value;
}

function identifier(value: unknown): string {
  const id = text(value, 'Identifier', crypto.randomUUID(), 200);
  if (!id) throw new Error('Identifiers cannot be empty.');
  return id;
}

function unique<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map(item => item.id)).size !== items.length) {
    throw new Error('Duplicate identifiers in imported data.');
  }
  return items;
}

export function imageUrl(value: unknown): string {
  const url = text(value, 'Image', '', 3 * 1024 * 1024);
  if (!/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(url)) {
    throw new Error('Images must be embedded PNG, JPEG, GIF, or WebP. Convert SVG or remote images before importing.');
  }
  return url;
}

export function validateEntry(value: unknown): Entry {
  const e = record(value, 'Entry');
  if (e.favorite !== undefined && typeof e.favorite !== 'boolean') {
    throw new Error('Favorite must be true or false.');
  }
  return {
    id: identifier(e.id), app: text(e.app, 'Entry name'), url: text(e.url, 'URL'),
    user: text(e.user, 'Username'), pass: text(e.pass, 'Password'),
    notes: text(e.notes, 'Notes'), favorite: e.favorite === true,
    colorTag: text(e.colorTag, 'Color tag'), modifiedAt: timestamp(e.modifiedAt),
    platformId: text(e.platformId, 'Platform identifier'),
    images: unique(list(e.images ?? [], 'Attachments', 100).map(value => {
      const attachment = record(value, 'Attachment');
      return { id: identifier(attachment.id), dataUrl: imageUrl(attachment.dataUrl) };
    })),
    passHistory: list(e.passHistory ?? [], 'Password history', 100).map(value => {
      const history = record(value, 'Password history');
      return { pass: text(history.pass, 'Historical password'), date: timestamp(history.date) };
    }),
  };
}

/** Construct a fresh object; never merge untrusted JSON into application state. */
export function validateVault(value: unknown): Vault {
  const input = record(value, 'Vault');
  if (input.schemaVersion !== undefined && input.schemaVersion !== 2) {
    throw new Error('Unsupported vault schema version.');
  }
  const vaults = unique(list(input.vaults, 'Account groups', 200).map(value => {
    const group = record(value, 'Account group');
    return {
      id: identifier(group.id), name: text(group.name, 'Group name'),
      entries: unique(list(group.entries ?? [], 'Entries').map(validateEntry)),
    };
  }));
  const entries = vaults.flatMap(group => group.entries);
  if (entries.length > MAX_ITEMS) throw new Error('Vault has too many entries.');
  unique(entries);
  const vault: Vault = {
    schemaVersion: 2, id: identifier(input.id), vaults,
    platforms: unique(list(input.platforms ?? [], 'Platforms', 1000).map(value => {
      const platform = record(value, 'Platform');
      return { id: identifier(platform.id), name: text(platform.name, 'Platform name'), icon: platform.icon == null || platform.icon === '' ? (platform.icon === '' ? '' : null) : imageUrl(platform.icon) };
    })),
  };
  if (new TextEncoder().encode(JSON.stringify(vault)).length > MAX_PLAINTEXT_BYTES) {
    throw new Error('Vault is too large to save in the supported encrypted format.');
  }
  return vault;
}
