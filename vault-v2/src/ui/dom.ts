import { setText, type LocalizedText } from '../i18n/locale';
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K, className = '', text?: LocalizedText,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) setText(node, text);
  return node;
}

export function button(label: LocalizedText, action: () => void, className = 'button'): HTMLButtonElement {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function field(label: LocalizedText, type = 'text', value = ''): {
  wrapper: HTMLLabelElement; input: HTMLInputElement;
} {
  const wrapper = element('label', 'field');
  const input = element('input');
  input.type = type;
  input.value = value;
  input.autocomplete = 'off';
  input.dir = type === 'password' ? 'ltr' : 'auto';
  wrapper.append(element('span', 'label', label), input);
  return { wrapper, input };
}

/** Clear sensitive properties before detaching an unlocked view. */
export function clearView(root: HTMLElement): void {
  root.querySelectorAll('input, textarea').forEach(node => {
    (node as HTMLInputElement).value = '';
  });
  root.querySelectorAll('img').forEach(node => node.removeAttribute('src'));
  root.querySelectorAll('[data-secret]').forEach(node => { node.textContent = ''; });
  root.replaceChildren();
}

