import { msg } from '../i18n/locale';
import { generatePassword } from '../crypto/passwords';
import { emptyEntry, type Entry, type Vault } from '../vault/types';
import { imageUrl, MAX_PLAINTEXT_BYTES, validateVault } from '../vault/validation';
import { button, element, field } from './dom';

interface EditorOptions {
  vault: Vault;
  groupId: string;
  isLocked(): boolean;
  attempt(action: () => Promise<void>): void;
  commit(vault: Vault, entryId: string): void;
  cancel(): void;
}

export function renderEntryEditor(pane: HTMLElement, existing: Entry | null, options: EditorOptions): void {
    const draft = existing ? structuredClone(existing) : emptyEntry();
    pane.append(element('h2', '', existing ? msg('Edit entry') : msg('New entry')));
    const form = element('form', 'entry-form');
    const name = field(msg('Name'), 'text', draft.app);
    name.input.required = true;
    const user = field(msg('Username'), 'text', draft.user);
    const url = field(msg('Website URL'), 'text', draft.url);
    const pass = field(msg('Password'), 'password', draft.pass);
    const notes = element('label', 'field');
    const textarea = element('textarea');
    textarea.value = draft.notes;
    textarea.rows = 5;
    textarea.dir = 'auto';
    notes.append(element('span', 'label', msg('Notes')), textarea);
    const groups = element('label', 'field');
    const select = element('select');
    const source = options.vault.vaults.flatMap(group => group.entries.map(entry => ({ group, entry }))).find(item => item.entry.id === existing?.id)?.group;
    for (const group of options.vault.vaults) {
      const option = element('option', '', group.name);
      option.value = group.id;
      select.append(option);
    }
    select.value = source?.id ?? (options.vault.vaults.find(group => group.id === options.groupId)?.id ?? options.vault.vaults[0]?.id ?? '');
    groups.append(element('span', 'label', msg('Account group')), select);
    const attachments = field(msg('Add images (PNG, JPEG, WebP, GIF)'), 'file');
    attachments.input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    attachments.input.multiple = true;
    const uploaded = element('p', 'footnote', msg('{count} saved attachments', { count: draft.images.length }));
    const generate = button(msg('Generate 24-character password'), () => { pass.input.value = generatePassword(); }, 'button small');
    form.append(name.wrapper, groups, user.wrapper, url.wrapper, pass.wrapper, generate, notes, attachments.wrapper, uploaded);
    const save = element('button', 'button primary', msg('Save entry'));
    save.type = 'submit';
    form.append(save, button(msg('Cancel'), () => options.cancel(), 'button subtle'));
    form.onsubmit = event => {
      event.preventDefault();
      options.attempt(async () => {
        if (!name.input.value.trim()) throw new Error('Enter an entry name.');
        const target = options.vault.vaults.find(group => group.id === select.value);
        if (!target) throw new Error('Add an account group before saving an entry.');
        const newImages = [];
        for (const file of Array.from(attachments.input.files ?? [])) {
          if (file.size > 2 * 1024 * 1024) throw new Error('Each image must be smaller than 2 MB.');
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Could not read attachment.'));
            reader.readAsDataURL(file);
          });
          newImages.push({ id: crypto.randomUUID(), dataUrl: imageUrl(dataUrl) });
        }
        // Awaited file reads can span an inactivity lock. Do not mutate stale state.
        if (options.isLocked()) throw new Error('Vault locked. Unlock and try again.');
        if (draft.pass && draft.pass !== pass.input.value) {
          draft.passHistory = [{ pass: draft.pass, date: Date.now() }, ...draft.passHistory].slice(0, 5);
        }
        Object.assign(draft, {
          app: name.input.value.trim(), user: user.input.value, url: url.input.value.trim(),
          pass: pass.input.value, notes: textarea.value, modifiedAt: Date.now(),
          images: [...draft.images, ...newImages],
        });
        if (draft.images.length > 100) throw new Error('At most 100 images are supported per entry.');
        const next = validateVault({
          ...options.vault,
          vaults: options.vault.vaults.map(group => ({
            ...group,
            entries: [
              ...group.entries.filter(entry => entry.id !== draft.id),
              ...(group.id === target.id ? [draft] : []),
            ],
          })),
        });
        if (new TextEncoder().encode(JSON.stringify(next)).length > MAX_PLAINTEXT_BYTES) {
          throw new Error('This entry would exceed the vault size limit.');
        }
        options.commit(next, draft.id);
      });
    };
    pane.append(form);
    name.input.focus();
}
