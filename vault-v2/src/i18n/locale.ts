import { arabic } from './ar';
export type Language = 'en' | 'ar';
type Parameters = Record<string, string | number | Date>;
export interface Message { readonly key: string; readonly parameters: Parameters; }
export type LocalizedText = string | Message;
const preferenceKey = 'local-vault-language';
let language: Language = 'en';
// Only application copy is bound. Weak references release detached views.
const bindings = new WeakMap<Element, Map<string, Message>>();
export function currentLanguage(): Language { return language; }
export function msg(key: string, parameters: Parameters = {}): Message { return { key, parameters }; }
export function t(key: string, parameters: Parameters = {}): string {
  let template = language === 'ar' ? arabic[key] ?? key : key;
  if (language === 'en' && key === '{count} entries' && parameters.count === 1) template = '{count} entry';
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = parameters[name];
    if (value === undefined) return token;
    if (value instanceof Date) return value.toLocaleString(language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en');
    return typeof value === 'number' ? value.toLocaleString(language === 'ar' ? 'ar-SA' : 'en') : value;
  });
}
function render(value: LocalizedText): string { return typeof value === 'string' ? value : t(value.key, value.parameters); }
function bind(node: Element, property: string, value: LocalizedText): void {
  const existing = bindings.get(node) ?? new Map<string, Message>();
  if (typeof value === 'string') existing.delete(property); else existing.set(property, value);
  if (existing.size) bindings.set(node, existing); else bindings.delete(node);
}
export function setText(node: Element, value: LocalizedText): void {
  bind(node, 'textContent', value); node.textContent = render(value);
}
export function setAttribute(node: Element, attribute: string, value: LocalizedText): void {
  bind(node, attribute, value); node.setAttribute(attribute, render(value));
}
export function setLanguage(next: Language, persist = true): void {
  language = next;
  if (persist) { try { window.localStorage.setItem(preferenceKey, next); } catch { /* Storage may be unavailable. */ } }
  document.documentElement.lang = next;
  document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  for (const node of document.querySelectorAll('*')) {
    for (const [property, value] of bindings.get(node) ?? []) {
      if (property === 'textContent') node.textContent = render(value); else node.setAttribute(property, render(value));
    }
  }
}
export function initializeLanguage(): void {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(preferenceKey); } catch { /* Use browser language. */ }
  const preferred = navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  setLanguage(saved === 'ar' || saved === 'en' ? saved : preferred, false);
  const title = document.querySelector('title');
  if (title) setText(title, msg('Local Vault'));
}
export function errorMessage(error: unknown): Message {
  if (error instanceof DOMException && error.name === 'OperationError') return msg('Could not unlock: wrong password or damaged file.');
  if (error instanceof Error && arabic[error.message]) return msg(error.message);
  if (error instanceof SyntaxError || (error instanceof Error && /must be (an object|text within the size limit|a list with at most)/.test(error.message))) return msg('Invalid vault data. Check the file format and supported limits.');
  return msg('The operation could not be completed.');
}
