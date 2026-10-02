import { msg, t, setText, setAttribute, errorMessage, type LocalizedText } from '../i18n/locale';
import { deriveContext } from '../crypto/vault-crypto';
import { importVault, parseVaultFile } from '../imports/import-vault';
import { VaultSession, type SaveStatus } from '../session/session';
import type { VaultRepository } from '../storage/repository';
import { emptyVault, type Entry, type Group } from '../vault/types';
import { MAX_FILE_BYTES } from '../vault/validation';
import { button, clearView, element, field } from './dom';
import { renderEntryDetails } from './entry-details';
import { renderEntryEditor } from './entry-editor';
import { exportEncryptedJson } from '../platform/export-file';
import { renderSetupScreen, renderUnlockScreen } from './auth-screens';

export class VaultApp {
  private session: VaultSession;
  private groupId = 'all';
  private selectedId: string | null = null;
  private query = '';
  private status: SaveStatus = 'saved';
  private lastActivity = Date.now();
  private timer: ReturnType<typeof setInterval>;
  private events = new AbortController();
  private working = false;
  private locked = true;

  constructor(private root: HTMLElement, private repository: VaultRepository) {
    this.session = new VaultSession(repository);
    this.session.onStatus = status => {
      this.status = status;
      const node = this.root.querySelector('[data-save-status]');
      if (node) setText(node, this.statusText());
      if (status === 'failed') this.message(msg('Encrypted save failed. Use Export backup to protect your changes.'), true);
    };
    const signal = this.events.signal;
    for (const event of ['pointerdown', 'keydown', 'touchstart', 'scroll']) {
      document.addEventListener(event, () => {
        // Check the deadline before recording new activity after a suspended tab resumes.
        if (!this.locked && Date.now() - this.lastActivity >= 5 * 60_000) this.lock();
        this.lastActivity = Date.now();
      }, { signal, capture: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!this.locked && Date.now() - this.lastActivity >= 5 * 60_000) this.lock();
    }, { signal });
    window.addEventListener('beforeunload', event => {
      if (this.status !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    }, { signal });
    this.timer = setInterval(() => {
      if (!this.locked && Date.now() - this.lastActivity >= 5 * 60_000) this.lock();
    }, 1000);
  }

  canReload(): boolean { return this.locked && this.status === 'saved'; }

  dispose(): void {
    clearInterval(this.timer);
    this.events.abort();
    void this.session.lock();
    clearView(this.root);
  }

  private statusText(): LocalizedText {
    return this.status === 'saved' ? msg('Saved encrypted on this browser') :
      this.status === 'saving' ? msg('Encrypting and saving…') : msg('Save failed — export a backup');
  }

  private message(text: LocalizedText, error = false): void {
    let node = this.root.querySelector<HTMLElement>('[data-message]');
    if (!node) {
      node = element('p', 'notice');
      node.dataset.message = '';
      node.setAttribute('role', 'status');
      this.root.prepend(node);
    }
    node.className = error ? 'notice error' : 'notice';
    setText(node, text);
  }

  private attempt(action: () => Promise<void>): void {
    if (this.working) return;
    this.working = true;
    this.root.setAttribute('aria-busy', 'true');
    this.root.querySelectorAll<HTMLButtonElement>('button').forEach(node => { node.disabled = true; });
    void action().catch(error => {
      const text = errorMessage(error);
      this.message(text, true);
    }).finally(() => {
      this.working = false;
      this.root.removeAttribute('aria-busy');
      this.root.querySelectorAll<HTMLButtonElement>('button').forEach(node => { node.disabled = false; });
    });
  }

  async start(): Promise<void> {
    const saved = await this.repository.load();
    renderUnlockScreen(this.root, !!saved, {
      attempt: action => this.attempt(action),
      unlock: async password => {
        const imported = await importVault(saved, password);
        this.enter(imported.vault, imported.context);
      },
      openFile: () => this.setup('import', !!saved),
      create: () => this.setup('new', !!saved),
      recover: async () => {
        const previous = await this.repository.load(true);
        if (!previous) throw new Error('There is no previous snapshot to recover.');
        this.setup('import', true, previous);
        this.message(msg('Enter the passphrase for the previous snapshot. Recovery will replace the current browser copy.'));
      },
    });
  }

  private setup(mode: 'new' | 'import', replaces: boolean, recovery?: unknown): void {
    renderSetupScreen(this.root, {
      mode, recovery: recovery !== undefined,
      attempt: action => this.attempt(action),
      back: () => this.start(),
      submit: async (password, confirmation, file) => {
        if (replaces && !window.confirm(t('Replace the saved browser vault? Export the current vault first if you need it. The imported file will not be modified.'))) return;
        let vault;
        let context;
        let migrated = false;
        if (mode === 'new') {
          if (password.length < 14 || password !== confirmation) {
            throw new Error('Use at least 14 characters and matching passphrases.');
          }
          vault = emptyVault();
          vault.vaults[0]!.name = t('Personal');
          context = await deriveContext(password);
        } else {
          if (!recovery && (!file || file.size > MAX_FILE_BYTES)) throw new Error('Choose a JSON file no larger than 20 MB.');
          const input = recovery ?? parseVaultFile(await file!.text());
          ({ vault, context, migrated } = await importVault(input, password));
        }
        this.enter(vault, context);
        await this.session.save();
        if (migrated) this.message(msg('Imported and saved in v2 format. Your original file is unchanged. Export a new backup.'));
      },
    });
  }

  private enter(vault: Parameters<VaultSession['open']>[0], context: Parameters<VaultSession['open']>[1]): void {
    this.session.open(vault, context);
    this.locked = false;
    this.lastActivity = Date.now();
    this.groupId = 'all';
    this.query = '';
    this.selectedId = null;
    this.render();
  }

  private lock(): void {
    if (this.locked) return;
    this.locked = true;
    this.query = '';
    this.selectedId = null;
    clearView(this.root);
    const complete = this.session.lock();
    this.root.className = 'locked-shell';
    this.root.append(element('p', 'muted', msg('Locking vault…')));
    this.working = true;
    void (async () => {
      await complete;
      await this.start();
      if (this.status === 'failed') {
        this.message(msg('Vault locked, but the encrypted save failed. Download the pending encrypted backup before closing.'), true);
        this.root.append(button(msg('Download pending encrypted backup'), () => this.attempt(async () => {
          await exportEncryptedJson(await this.session.export());
        }), 'button primary'));
      }
    })().catch(() => {
      this.message(msg('Vault locked. Could not reopen browser storage. Reload after allowing storage.'), true);
    }).finally(() => { this.working = false; });
  }

  private render(): void {
    clearView(this.root);
    this.root.className = this.selectedId ? 'workspace detail-open' : 'workspace';
    const sidebar = element('aside', 'sidebar');
    sidebar.id = 'vault-navigation';
    sidebar.append(element('div', 'brand', msg('V / LOCAL VAULT')), element('p', 'eyebrow', msg('LIBRARY')));
    const nav = (label: LocalizedText, id: string) => button(label, () => {
      this.groupId = id;
      this.selectedId = null;
      this.render();
    }, `nav-button ${this.groupId === id ? 'active' : ''}`);
    sidebar.append(nav(msg('All entries'), 'all'), nav(msg('Favorites'), 'favorites'), nav(msg('Password review'), 'review'), element('p', 'eyebrow', msg('ACCOUNT GROUPS')));
    for (const group of this.session.current().vaults) sidebar.append(nav(group.name, group.id));
    sidebar.append(button(msg('+ Add group'), () => {
      const name = window.prompt(t('Group name'));
      if (!name?.trim()) return;
      this.session.current().vaults.push({ id: crypto.randomUUID(), name: name.trim(), entries: [] });
      this.changed();
    }, 'button subtle'));
    const bottom = element('div', 'sidebar-bottom');
    bottom.append(button(msg('Export encrypted backup'), () => this.attempt(async () => {
      await exportEncryptedJson(await this.session.export());
      this.message(msg('Encrypted backup ready. Keep the saved file and passphrase safe.'));
    })), button(msg('Change master passphrase'), () => this.changePassphrase(), 'button subtle'), button(msg('Lock vault'), () => this.lock(), 'button subtle'),
      element('p', 'footnote', msg('Local only · AES-256-GCM\nNo analytics or remote icons')));
    sidebar.append(bottom);
    const body = element('section', 'vault-body');
    const toolbar = element('header', 'toolbar');
    const heading = element('div');
    const title = this.session.current().vaults.find(group => group.id === this.groupId)?.name ??
      (this.groupId === 'favorites' ? msg('Favorites') : this.groupId === 'review' ? msg('Password review') : msg('All entries'));
    heading.append(element('p', 'eyebrow', msg('YOUR VAULT')), element('h1', '', title));
    const saved = element('span', 'save-status', this.statusText());
    saved.dataset.saveStatus = '';
    const menu = button(msg('Groups & actions'), () => {
      const opened = this.root.classList.toggle('menu-open');
      menu.setAttribute('aria-expanded', String(opened));
      if (opened) sidebar.scrollIntoView?.({ block: 'start' });
    }, 'button mobile-menu');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-controls', 'vault-navigation');
    toolbar.append(menu, heading, saved, button(msg('+ Add entry'), () => this.edit(null), 'button primary'));
    if (!['all', 'favorites', 'review'].includes(this.groupId)) toolbar.append(button(msg('Rename group'), () => {
      const group = this.session.current().vaults.find(item => item.id === this.groupId)!;
      const name = window.prompt(t('New group name'), group.name);
      if (!name?.trim()) return;
      group.name = name.trim();
      this.changed();
    }, 'button subtle'));
    const search = field(msg('Search all entries'), 'search', this.query);
    search.wrapper.classList.add('search');
    setAttribute(search.input, 'placeholder', msg('Search names, usernames, URLs, or notes'));
    search.input.addEventListener('input', () => {
      this.query = search.input.value;
      this.root.classList.remove('detail-open');
      this.renderResults();
    });
    const panes = element('div', 'panes');
    const list = element('section', 'entry-list');
    list.id = 'entry-list';
    setAttribute(list, 'aria-label', msg('Vault entries'));
    const details = element('section', 'details');
    details.id = 'details';
    setAttribute(details, 'aria-label', msg('Entry details'));
    panes.append(list, details);
    body.append(toolbar, search.wrapper, panes);
    this.root.append(sidebar, body);
    this.renderResults();
  }

  private allEntries(): { group: Group; entry: Entry }[] {
    return this.session.current().vaults.flatMap(group => group.entries.map(entry => ({ group, entry })));
  }

  private renderResults(): void {
    const list = this.root.querySelector<HTMLElement>('#entry-list')!;
    clearView(list);
    const all = this.allEntries();
    const counts = new Map<string, number>();
    for (const { entry } of all) if (entry.pass) counts.set(entry.pass, (counts.get(entry.pass) ?? 0) + 1);
    const query = this.query.toLowerCase();
    const visible = all.filter(({ group, entry }) => {
      // A nonempty query always searches every account group.
      const matchesGroup = !!query || this.groupId === 'all' ||
        (this.groupId === 'favorites' ? entry.favorite :
          this.groupId === 'review' ? !entry.pass || entry.pass.length < 14 || (counts.get(entry.pass) ?? 0) > 1 : group.id === this.groupId);
      return matchesGroup && [entry.app, entry.user, entry.url, entry.notes].some(value => value.toLowerCase().includes(query));
    });
    list.append(element('p', 'result-count', msg('{count} entries', { count: visible.length })));
    if (this.groupId === 'review' && !query) list.append(element('p', 'footnote', msg('Review missing, short, and reused passwords. Length alone does not establish password strength.')));
    if (!visible.length) list.append(element('div', 'empty-state', query ? msg('No matching entries.') : msg('Your next account belongs here. Add an entry to get started.')));
    for (const { group, entry } of visible) {
      const item = button('', () => {
        this.selectedId = entry.id;
        this.root.classList.add('detail-open');
        this.renderResults();
        this.root.querySelector<HTMLElement>('#details')?.scrollIntoView?.({ block: 'start' });
      }, `entry-button ${entry.id === this.selectedId ? 'selected' : ''}`);
      const initial = element('span', 'entry-initial', entry.app.slice(0, 1).toUpperCase() || '?');
      const text = element('span', 'entry-summary');
      text.append(element('strong', '', entry.app || msg('Untitled')), element('span', 'muted', entry.user || msg('No username')), element('small', 'muted', group.name));
      item.append(initial, text);
      if (entry.favorite) item.append(element('span', 'star', '★'));
      list.append(item);
    }
    // Remove secret-bearing count keys promptly after the review calculation.
    counts.clear();
    const selected = visible.find(item => item.entry.id === this.selectedId);
    const details = this.root.querySelector<HTMLElement>('#details')!;
    clearView(details);
    if (selected) details.append(button(msg('← Back to entries'), () => {
      this.selectedId = null;
      this.root.classList.remove('detail-open');
      this.renderResults();
    }, 'button mobile-back'));
    if (selected) renderEntryDetails(selected.entry, selected.group, details, {
      edit: entry => this.edit(entry),
      copy: value => this.copy(value),
      favorite: () => { selected.entry.favorite = !selected.entry.favorite; this.changed(); },
      remove: () => {
        selected.group.entries = selected.group.entries.filter(entry => entry.id !== selected.entry.id);
        this.selectedId = null;
        this.changed();
      },
    });
    else {
      this.selectedId = null;
      this.root.classList.remove('detail-open');
      details.append(element('div', 'empty-state', msg('Select an entry to view its details.')));
    }
  }

  private copy(value: string): void {
    this.attempt(async () => {
      await navigator.clipboard.writeText(value);
      this.message(msg('Copied. Your clipboard may retain the value; clear it after use.'));
    });
  }

  private changePassphrase(): void {
    const pane = this.root.querySelector<HTMLElement>('#details')!;
    clearView(pane);
    this.root.classList.add('detail-open');
    this.root.classList.remove('menu-open');
    pane.append(element('h2', '', msg('Change master passphrase')),
      element('p', 'muted', msg('Old backup files still use the old passphrase. Export a new backup after changing it.')));
    const form = element('form');
    const pass = field(msg('New master passphrase (14+ characters)'), 'password');
    const confirmation = field(msg('Confirm new passphrase'), 'password');
    for (const input of [pass.input, confirmation.input]) {
      input.autocomplete = 'new-password';
      input.required = true;
      input.minLength = 14;
    }
    const save = element('button', 'button primary', msg('Change passphrase'));
    save.type = 'submit';
    form.append(pass.wrapper, confirmation.wrapper, save, button(msg('Cancel'), () => this.renderResults(), 'button subtle'));
    form.onsubmit = event => {
      event.preventDefault();
      this.attempt(async () => {
        if (pass.input.value.length < 14 || pass.input.value !== confirmation.input.value) {
          throw new Error('Use at least 14 characters and matching passphrases.');
        }
        const context = await deriveContext(pass.input.value);
        pass.input.value = '';
        confirmation.input.value = '';
        if (this.locked) throw new Error('Vault locked. Unlock and try again.');
        await this.session.changeKey(context);
        this.renderResults();
        this.message(msg('Passphrase changed for the browser copy. Export a new encrypted backup now.'));
      });
    };
    pane.append(form);
    pass.input.focus();
  }

  private changed(): void {
    void this.session.save().catch(() => {});
    this.render();
  }

  private edit(existing: Entry | null): void {
    const pane = this.root.querySelector<HTMLElement>('#details')!;
    clearView(pane);
    this.root.classList.add('detail-open');
    this.root.classList.remove('menu-open');
    pane.append(button(msg('← Back to entries'), () => {
      this.root.classList.remove('detail-open');
      this.renderResults();
    }, 'button mobile-back'));
    renderEntryEditor(pane, existing, {
      vault: this.session.current(),
      groupId: this.groupId,
      isLocked: () => this.locked,
      attempt: action => this.attempt(action),
      cancel: () => { this.root.classList.remove('detail-open'); this.renderResults(); },
      commit: (vault, entryId) => {
        void this.session.replaceVault(vault).catch(() => {});
        this.selectedId = entryId;
        this.groupId = 'all';
        this.render();
      },
    });
  }
}
