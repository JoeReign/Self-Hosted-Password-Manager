export interface Attachment {
  id: string;
  dataUrl: string;
}

export interface Entry {
  id: string;
  app: string;
  url: string;
  user: string;
  pass: string;
  notes: string;
  favorite: boolean;
  colorTag: string;
  modifiedAt: number;
  passHistory: { pass: string; date: number }[];
  platformId: string;
  images: Attachment[];
}

export interface Group {
  id: string;
  name: string;
  entries: Entry[];
}

export interface Vault {
  schemaVersion: 2;
  id: string;
  vaults: Group[];
  platforms: { id: string; name: string; icon: string | null }[];
}

export function emptyVault(): Vault {
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    vaults: [{ id: crypto.randomUUID(), name: 'Personal', entries: [] }],
    platforms: [],
  };
}

export function emptyEntry(): Entry {
  return {
    id: crypto.randomUUID(), app: '', url: '', user: '', pass: '', notes: '',
    favorite: false, colorTag: '', modifiedAt: Date.now(), passHistory: [],
    platformId: '', images: [],
  };
}
