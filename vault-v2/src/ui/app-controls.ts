import { ThemeController, THEMES } from '../preferences/theme';
import { InstallController } from '../pwa/install';
import { button, element } from './dom';

export class AppControls {
  private theme = new ThemeController();
  private install: InstallController;
  private updates = element('div', 'update-slot');
  private state = element('span', 'connection-status', 'Local Vault');
  private help = element('dialog', 'install-dialog');

  constructor(private root: HTMLElement) {
    const label = element('label', 'theme-picker');
    const select = element('select');
    select.setAttribute('aria-label', 'Theme');
    const names = { system: 'Auto · system', light: 'Light', dark: 'Dark', cyberpunk: 'Cyberpunk', forest: 'Forest' };
    for (const theme of THEMES) {
      const option = element('option', '', names[theme]);
      option.value = theme;
      select.append(option);
    }
    select.value = this.theme.current();
    select.addEventListener('change', () => this.theme.set(select.value as typeof THEMES[number]));
    label.append(element('span', '', 'Theme'), select);
    const install = element('button', 'button small', 'Install / help');
    install.type = 'button';
    this.install = new InstallController(install, () => this.openHelp());
    this.root.append(this.state, this.updates, label, install);
    const close = button('Close', () => this.help.close(), 'button primary');
    this.help.append(element('h2', '', 'Keep Vault one tap away'),
      element('h3', '', 'Samsung / Android'), element('p', '', 'Open this link in Chrome or Samsung Internet. Use Install app if offered, or the browser menu → Add to Home screen.'),
      element('h3', '', 'iPhone / iPad'), element('p', '', 'Open the link in Safari. Tap Share (or the browser menu → Share), then Add to Home Screen. Enable Open as Web App if shown, and tap Add.'),
      element('h3', '', 'Desktop'), element('p', '', 'In Chrome or Edge, use Install app or the install icon in the address bar. On supported Macs, Safari offers Add to Dock.'),
      element('p', 'footnote', 'Offline use is available after the app files have been saved. Your vault stays on this device. To move it, export encrypted JSON and import it on the other device. Browser and installed-app storage may be separate; import your backup if the installed app starts empty.'), close);
    document.body.append(this.help);
  }

  setReady(): void { this.state.textContent = 'Ready for offline use'; }
  setUnavailable(): void { this.state.textContent = 'Online access · offline setup unavailable'; }

  offerUpdate(activate: () => void, canReload: () => boolean): void {
    this.updates.replaceChildren(button('Update app', () => {
      if (!canReload()) {
        this.help.querySelector('.update-guidance')?.remove();
        this.help.prepend(element('p', 'notice update-guidance', 'Save and lock your vault before applying an app update.'));
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
