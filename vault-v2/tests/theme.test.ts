import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { ThemeController } from '../src/preferences/theme';

test('system theme responds to device changes; explicit selections persist without vault data', () => {
  const dom = new JSDOM('<meta name="theme-color" content="">', { url: 'https://example.test' });
  const media = new dom.window.EventTarget() as unknown as MediaQueryList;
  Object.defineProperty(media, 'matches', { value: false, writable: true });
  dom.window.matchMedia = () => media;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
  const controller = new ThemeController();
  assert.equal(dom.window.document.documentElement.dataset.theme, 'light');
  Object.defineProperty(media, 'matches', { value: true });
  media.dispatchEvent(new dom.window.Event('change'));
  assert.equal(dom.window.document.documentElement.dataset.theme, 'dark');
  controller.set('cyberpunk');
  Object.defineProperty(media, 'matches', { value: false });
  media.dispatchEvent(new dom.window.Event('change'));
  assert.equal(dom.window.document.documentElement.dataset.theme, 'cyberpunk');
  assert.equal(dom.window.localStorage.getItem('local-vault-theme'), 'cyberpunk');
  controller.dispose();
  const reopened = new ThemeController();
  assert.equal(reopened.current(), 'cyberpunk');
  assert.equal(dom.window.document.querySelector('meta')?.content, '#09081b');
  reopened.dispose();
  dom.window.close();
});

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
}
function contrast(a: string, b: string): number {
  const [bright, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (bright! + .05) / (dark! + .05);
}

test('all theme palettes meet normal-text contrast for primary, muted, and accent text', () => {
  const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');
  const blocks = [...css.matchAll(/:root(?:[^{}]*)\{([^}]+)\}/g)];
  assert.equal(blocks.length, 4);
  for (const block of blocks) {
    const tokens = Object.fromEntries([...block[1]!.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map(match => [match[1], match[2]]));
    for (const background of ['background', 'surface', 'surface-raised']) {
      for (const foreground of ['text', 'muted', 'accent']) {
        assert.ok(contrast(tokens[foreground]!, tokens[background]!) >= 4.5, `${foreground} on ${background} has insufficient contrast`);
      }
    }
    assert.ok(contrast(tokens['accent-text']!, tokens.accent!) >= 4.5);
  }
});
