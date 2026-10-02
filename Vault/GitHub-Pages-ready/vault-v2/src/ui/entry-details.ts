import type { Entry, Group } from '../vault/types';
import { button, element } from './dom';

interface DetailActions {
  edit(entry: Entry): void;
  copy(value: string): void;
  favorite(): void;
  remove(): void;
}

export function renderEntryDetails(entry: Entry, group: Group, pane: HTMLElement, actions: DetailActions): void {
    pane.append(element('p', 'eyebrow', group.name), element('h2', '', entry.app));
    const toolbar = element('div', 'actions');
    toolbar.append(button('Edit', () => actions.edit(entry)), button(entry.favorite ? '★ Favorited' : '☆ Favorite', () => {
      actions.favorite();
    }, 'button subtle'));
    pane.append(toolbar);
    const info = (label: string, value: string) => {
      const block = element('div', 'detail-field');
      block.append(element('p', 'label', label), element('p', 'value', value || '—'));
      pane.append(block);
      return block;
    };
    info('Username', entry.user).append(button('Copy username', () => actions.copy(entry.user), 'button small'));
    const password = info('Password', '••••••••••••');
    const value = password.querySelector<HTMLElement>('.value')!;
    value.dataset.secret = '';
    let revealed = false;
    const reveal = button('Reveal', () => {
      revealed = !revealed;
      value.textContent = revealed ? entry.pass : '••••••••••••';
      reveal.textContent = revealed ? 'Hide' : 'Reveal';
    }, 'button small');
    password.append(reveal, button('Copy password', () => actions.copy(entry.pass), 'button small'));
    info('Website', entry.url);
    info('Notes', entry.notes);
    if (entry.colorTag) info('Color tag', entry.colorTag);
    if (entry.passHistory.length) {
      const history = element('details', 'history');
      history.append(element('summary', '', `Password history (${entry.passHistory.length})`));
      for (const item of entry.passHistory) {
        const row = element('div', 'history-row');
        row.append(element('span', 'muted', new Date(item.date).toLocaleDateString()), button('Copy previous password', () => actions.copy(item.pass), 'button small'));
        history.append(row);
      }
      pane.append(history);
    }
    for (const attachment of entry.images) {
      const image = element('img', 'attachment');
      image.src = attachment.dataUrl;
      image.alt = 'Saved vault attachment';
      pane.append(image);
    }
    pane.append(element('p', 'footnote', `Last edited ${new Date(entry.modifiedAt).toLocaleString()}`),
      button('Delete entry', () => {
        if (!window.confirm(`Delete “${entry.app}”? Export a backup first if you may need this entry later.`)) return;
        actions.remove();
      }, 'button danger'));
}
