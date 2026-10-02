import { msg, setText, setAttribute, currentLanguage, setLanguage } from '../i18n/locale';
import { ThemeController, THEMES } from '../preferences/theme';
import { InstallController } from '../pwa/install';
import { button, element } from './dom';

export class AppControls {
  private theme = new ThemeController();
  private install: InstallController;
  private updates = element('div', 'update-slot');
  private state = element('span', 'connection-status', msg('Local Vault'));
  private help = element('dialog', 'install-dialog');

  constructor(private root: HTMLElement) {
    const label = element('label', 'theme-picker');
    const select = element('select');
    setAttribute(select, 'aria-label', msg('Theme'));
    const names = { system: msg('Auto · system'), light: msg('Light'), dark: msg('Dark'), cyberpunk: msg('Cyberpunk'), forest: msg('Forest') };
    for (const theme of THEMES) {
      const option = element('option', '', names[theme]);
      option.value = theme;
      select.append(option);
    }
    select.value = this.theme.current();
    select.addEventListener('change', () => this.theme.set(select.value as typeof THEMES[number]));
    label.append(element('span', '', msg('Theme')), select);
    const install = element('button', 'button small', msg('Install / help'));
    install.type = 'button';
    this.install = new InstallController(install, () => this.openHelp());
    const languageLabel = element('label', 'theme-picker language-picker');
    const languageSelect = element('select');
    setAttribute(languageSelect, 'aria-label', msg('Language'));
    for (const [value, name] of [['en', 'English'], ['ar', 'العربية']]) {
      const option = element('option', '', name);
      option.value = value!;
      option.lang = value!;
      languageSelect.append(option);
    }
    languageSelect.value = currentLanguage();
    languageSelect.addEventListener('change', () => setLanguage(languageSelect.value === 'ar' ? 'ar' : 'en'));
    languageLabel.append(element('span', '', msg('Language')), languageSelect);
    setAttribute(this.root, 'aria-label', msg('Appearance and installation'));
    this.root.append(this.state, this.updates, languageLabel, label, install);
    const close = button(msg('Close'), () => this.help.close(), 'button primary');
    this.help.append(element('h2', '', msg('Keep Vault one tap away')),
      element('h3', '', msg('Samsung / Android')), element('p', '', msg('Open this link in Chrome or Samsung Internet. Use Install app if offered, or the browser menu → Add to Home screen.')),
      element('h3', '', msg('iPhone / iPad')), element('p', '', msg('Open the link in Safari. Tap Share (or the browser menu → Share), then Add to Home Screen. Enable Open as Web App if shown, and tap Add.')),
      element('h3', '', msg('Desktop')), element('p', '', msg('In Chrome or Edge, use Install app or the install icon in the address bar. On supported Macs, Safari offers Add to Dock.')),
      element('p', 'footnote', msg('Offline use is available after the app files have been saved. Your vault stays on this device. To move it, export encrypted JSON and import it on the other device. Browser and installed-app storage may be separate; import your backup if the installed app starts empty.')), close);
    document.body.append(this.help);
  }

  setReady(): void { setText(this.state, msg('Ready for offline use')); }
  setUnavailable(): void { setText(this.state, msg('Online access · offline setup unavailable')); }

  offerUpdate(activate: () => void, canReload: () => boolean): void {
    this.updates.replaceChildren(button(msg('Update app'), () => {
      if (!canReload()) {
        this.help.querySelector('.update-guidance')?.remove();
        this.help.prepend(element('p', 'notice update-guidance', msg('Save and lock your vault before applying an app update.')));
        this.openHelp();
        return;
      }
      activate();
    }, 'button small'));
  }

  dispose(): void { this.theme.dispose(); this.install.dispose(); this.help.remove(); this.root.replaceChildren(); }

  private openHelp(): void {
    if (!this.help.open) this.help.showModal();
  }
}
