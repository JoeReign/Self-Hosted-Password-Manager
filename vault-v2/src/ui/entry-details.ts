import { msg, t, setText, setAttribute, type LocalizedText } from '../i18n/locale';
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
    toolbar.append(button(msg('Edit'), () => actions.edit(entry)), button(entry.favorite ? msg('★ Favorited') : msg('☆ Favorite'), () => {
      actions.favorite();
    }, 'button subtle'));
    pane.append(toolbar);
    const info = (label: LocalizedText, value: string) => {
      const block = element('div', 'detail-field');
      block.append(element('p', 'label', label), element('p', 'value', value || '—'));
      block.querySelector('.value')!.setAttribute('dir', 'auto');
      pane.append(block);
      return block;
    };
    info(msg('Username'), entry.user).append(button(msg('Copy username'), () => actions.copy(entry.user), 'button small'));
    const password = info(msg('Password'), '••••••••••••');
    const value = password.querySelector<HTMLElement>('.value')!;
    value.dataset.secret = '';
    value.dir = 'ltr';
    let revealed = false;
    const reveal = button(msg('Reveal'), () => {
      revealed = !revealed;
      value.textContent = revealed ? entry.pass : '••••••••••••';
      setText(reveal, revealed ? msg('Hide') : msg('Reveal'));
    }, 'button small');
    password.append(reveal, button(msg('Copy password'), () => actions.copy(entry.pass), 'button small'));
    info(msg('Website'), entry.url);
    info(msg('Notes'), entry.notes);
    if (entry.colorTag) info(msg('Color tag'), entry.colorTag);
    if (entry.passHistory.length) {
      const history = element('details', 'history');
      history.append(element('summary', '', msg('Password history ({count})', { count: entry.passHistory.length })));
      for (const item of entry.passHistory) {
        const row = element('div', 'history-row');
        row.append(element('span', 'muted', msg('{date}', { date: new Date(item.date) })), button(msg('Copy previous password'), () => actions.copy(item.pass), 'button small'));
        history.append(row);
      }
      pane.append(history);
    }
    for (const attachment of entry.images) {
      const image = element('img', 'attachment');
      image.src = attachment.dataUrl;
      setAttribute(image, 'alt', msg('Saved vault attachment'));
      pane.append(image);
    }
    pane.append(element('p', 'footnote', msg('Last edited {date}', { date: new Date(entry.modifiedAt) })),
      button(msg('Delete entry'), () => {
        if (!window.confirm(t('Delete “{name}”? Export a backup first if you may need this entry later.', { name: entry.app }))) return;
        actions.remove();
      }, 'button danger'));
}
