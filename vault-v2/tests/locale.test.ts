import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { arabic } from '../src/i18n/ar';
import { initializeLanguage, setLanguage, currentLanguage, msg, setText, setAttribute, t, errorMessage } from '../src/i18n/locale';

test('language defaults, persisted preference, text bindings and untrusted values stay separate', () => {
  const dom = new JSDOM('<title>Local Vault</title><button></button><input><p></p>', { url: 'https://example.test/vault/' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
  Object.defineProperty(globalThis, 'navigator', { value: { language: 'ar-SA' }, configurable: true });
  initializeLanguage();
  assert.equal(currentLanguage(), 'ar');
  const button = document.querySelector('button')!;
  const input = document.querySelector('input')!;
  const content = document.querySelector('p')!;
  setText(button, msg('Save entry'));
  setAttribute(input, 'aria-label', msg('Password'));
  setText(content, 'Password'); // A user-supplied entry name equal to a translation key.
  input.value = 'سر خاص';
  assert.equal(button.textContent, 'حفظ الحساب');
  setLanguage('en');
  assert.equal(button.textContent, 'Save entry');
  assert.equal(input.value, 'سر خاص');
  assert.equal(content.textContent, 'Password');
  initializeLanguage();
  assert.equal(currentLanguage(), 'en');
  setLanguage('ar');
  setText(content, msg('Delete “{name}”? Export a backup first if you may need this entry later.', { name: '<script>alert(1)</script>' }));
  assert.equal(content.querySelector('script'), null);
  assert.ok(content.textContent?.includes('<script>'));
  assert.equal(t(errorMessage(new Error('Unsupported vault format.')).key), 'صيغة الخزنة غير مدعومة.');
  assert.equal(t(errorMessage(new SyntaxError('bad JSON')).key), arabic['Invalid vault data. Check the file format and supported limits.']);
  setLanguage('en', false);
  dom.window.close();
});

test('Arabic messages retain all interpolation parameters', () => {
  for (const [key, value] of Object.entries(arabic)) {
    assert.deepEqual([...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(),
      [...key.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), key);
  }
});
