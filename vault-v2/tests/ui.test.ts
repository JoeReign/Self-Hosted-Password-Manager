import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { deriveContext, seal, type Envelope } from '../src/crypto/vault-crypto';
import { emptyEntry, emptyVault } from '../src/vault/types';
import { VaultApp } from '../src/ui/app';
import type { VaultRepository } from '../src/storage/repository';

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('UI did not reach the expected state.');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function click(root: HTMLElement, label: string): void {
  const button = Array.from(root.querySelectorAll('button')).find(node => node.textContent === label);
  assert.ok(button, `Missing button: ${label}`);
  button.click();
}

function fill(root: HTMLElement, label: string, value: string): HTMLInputElement {
  const wrapper = Array.from(root.querySelectorAll('label')).find(node => node.querySelector('span')?.textContent === label);
  assert.ok(wrapper, `Missing field: ${label}`);
  const input = wrapper.querySelector('input')!;
  input.value = value;
  return input;
}

class MemoryRepository implements VaultRepository {
  current: Envelope | null = null;
  async load() { return this.current; }
  async save(envelope: Envelope) { this.current = structuredClone(envelope); }
}

async function fixture() {
  const dom = new JSDOM('<main id="app"></main>', { url: 'http://localhost' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    AbortController: dom.window.AbortController, FileReader: dom.window.FileReader });
  const vault = emptyVault();
  const entry = emptyEntry();
  Object.assign(entry, { app: '<img src=x onerror="alert(1)">', user: 'alice@example.test',
    pass: 'a secret only for this test', notes: 'PRIVATE_NOTE',
    images: [{ id: 'image', dataUrl: 'data:image/png;base64,aGVsbG8=' }] });
  vault.vaults[0]!.entries.push(entry);
  vault.vaults.push({ id: 'work', name: 'Work', entries: [{ ...emptyEntry(), app: 'Second account', user: 'work@example.test' }] });
  const repository = new MemoryRepository();
  repository.current = await seal(vault, await deriveContext('a long test master passphrase'));
  const root = dom.window.document.querySelector<HTMLElement>('#app')!;
  const app = new VaultApp(root, repository);
  await app.start();
  return { dom, root, app, vault, repository };
}

async function unlock(root: HTMLElement): Promise<void> {
  const pass = fill(root, 'Master passphrase', 'a long test master passphrase');
  pass.closest('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => !!root.querySelector('.workspace .toolbar'));
  await waitFor(() => !root.hasAttribute('aria-busy'));
}

test('UI renders imported names as text, searches across groups, and clears secrets on lock', async () => {
  const { dom, root, app } = await fixture();
  try {
    await unlock(root);
    assert.equal(root.querySelectorAll('script').length, 0);
    assert.equal(root.querySelectorAll('.entry-initial').length, 2);
    click(root, 'Work');
    assert.equal(root.querySelectorAll('.entry-initial').length, 1);
    const search = fill(root, 'Search all entries', 'alice');
    search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(root.querySelectorAll('.entry-initial').length, 1);
    root.querySelector<HTMLButtonElement>('.entry-button')!.click();
    assert.ok(root.textContent?.includes('<img src=x onerror="alert(1)">'));
    assert.equal(root.querySelectorAll('img').length, 1);
    click(root, 'Reveal');
    const secretNode = root.querySelector<HTMLElement>('[data-secret]')!;
    assert.equal(secretNode.textContent, 'a secret only for this test');
    click(root, 'Edit');
    const passwordInput = fill(root, 'Password', 'a secret only for this test');
    click(root, 'Lock vault');
    assert.equal(passwordInput.value, '');
    assert.equal(root.querySelectorAll('img').length, 0);
    assert.equal(root.textContent?.includes('PRIVATE_NOTE'), false);
    assert.equal(root.textContent?.includes('a secret only for this test'), false);
    await waitFor(() => !!root.querySelector('.unlock-card'));
  } finally { app.dispose(); dom.window.close(); }
});

test('UI edits persist encrypted and can be unlocked after locking', async () => {
  const { dom, root, app, repository } = await fixture();
  try {
    await unlock(root);
    root.querySelector<HTMLButtonElement>('.entry-button')!.click();
    click(root, 'Edit');
    const name = fill(root, 'Name', 'Updated entry');
    name.closest('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => root.querySelector('[data-save-status]')?.textContent === 'Saved encrypted on this browser');
    assert.equal(JSON.stringify(repository.current).includes('Updated entry'), false);
    click(root, 'Lock vault');
    await waitFor(() => !!root.querySelector('.unlock-card'));
    await unlock(root);
    assert.ok(root.textContent?.includes('Updated entry'));
  } finally { app.dispose(); dom.window.close(); }
});

test('UI locks before accepting activity after the inactivity deadline', async () => {
  const { dom, root, app } = await fixture();
  const originalNow = Date.now;
  try {
    await unlock(root);
    const future = originalNow() + 6 * 60_000;
    Date.now = () => future;
    dom.window.document.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
    assert.equal(root.querySelector('.toolbar'), null);
    Date.now = originalNow;
    await waitFor(() => !!root.querySelector('.unlock-card'));
  } finally { Date.now = originalNow; app.dispose(); dom.window.close(); }
});

test('mobile navigation opens entry details, returns to the list, and closes on lock', async () => {
  const { dom, root, app } = await fixture();
  try {
    await unlock(root);
    click(root, 'Groups & actions');
    assert.equal(root.classList.contains('menu-open'), true);
    assert.equal(root.querySelector('.mobile-menu')?.getAttribute('aria-expanded'), 'true');
    click(root, 'Work');
    assert.equal(root.classList.contains('menu-open'), false);
    root.querySelector<HTMLButtonElement>('.entry-button')!.click();
    assert.equal(root.classList.contains('detail-open'), true);
    click(root, '← Back to entries');
    assert.equal(root.classList.contains('detail-open'), false);
    click(root, 'Lock vault');
    assert.equal(root.classList.contains('menu-open'), false);
    assert.equal(root.classList.contains('detail-open'), false);
    await waitFor(() => !!root.querySelector('.unlock-card'));
    assert.equal(app.canReload(), true);
  } finally { app.dispose(); dom.window.close(); }
});

test('Arabic switches live without changing vault content or losing an unsaved draft', async () => {
  const { setLanguage } = await import('../src/i18n/locale');
  const { dom, root, app, repository } = await fixture();
  try {
    await unlock(root);
    root.querySelector<HTMLButtonElement>('.entry-button')!.click();
    click(root, 'Edit');
    const name = fill(root, 'Name', 'Password');
    const password = fill(root, 'Password', 'unchanged-secret-123');
    const encryptedBefore = JSON.stringify(repository.current);
    setLanguage('ar');
    assert.equal(document.documentElement.lang, 'ar');
    assert.equal(document.documentElement.dir, 'rtl');
    assert.ok(root.textContent?.includes('حفظ الحساب'));
    assert.ok(root.textContent?.includes('تصدير نسخة احتياطية مشفّرة'));
    assert.equal(name.value, 'Password');
    assert.equal(password.value, 'unchanged-secret-123');
    assert.equal(password.dir, 'ltr');
    assert.equal(JSON.stringify(repository.current), encryptedBefore);
    assert.equal(dom.window.localStorage.getItem('local-vault-language'), 'ar');
    setLanguage('en');
    assert.equal(document.documentElement.dir, 'ltr');
    assert.equal(name.value, 'Password');
    click(root, 'Lock vault');
    assert.equal(password.value, '');
    await waitFor(() => !!root.querySelector('.unlock-card'));
  } finally { setLanguage('en', false); app.dispose(); dom.window.close(); }
});
