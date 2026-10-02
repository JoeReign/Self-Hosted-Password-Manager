import { msg, initializeLanguage } from './i18n/locale';
import './style.css';
import { BrowserRepository } from './storage/repository';
import { VaultApp } from './ui/app';
import { element } from './ui/dom';
import { AppControls } from './ui/app-controls';
import { registerOfflineApp } from './pwa/updates';

initializeLanguage();
const controls = new AppControls(document.querySelector<HTMLElement>('#app-controls')!);
let app: VaultApp | null = null;
void registerOfflineApp(activate => controls.offerUpdate(activate, () => !!app?.canReload()),
  () => controls.setReady(), () => controls.setUnavailable());

const root = document.querySelector<HTMLElement>('#app')!;

async function boot(): Promise<void> {
  if (!crypto.subtle || !navigator.locks) {
    throw new Error('Use a current browser over HTTPS or localhost. Encryption and browser tab coordination are required.');
  }
  const scope = new URL(import.meta.env.BASE_URL, location.href).pathname;
  // Only one app instance may use this origin's browser vault at a time.
  await navigator.locks.request(`local-vault-writer:${scope}`, { ifAvailable: true }, async lock => {
    if (!lock) {
      root.append(element('p', 'notice', msg('Vault is already open in another tab. Close that tab, then reload this one.')));
      return;
    }
    app = new VaultApp(root, new BrowserRepository(scope));
    await app.start();
    await new Promise<void>(resolve => {
      window.addEventListener('pagehide', () => { app?.dispose(); controls.dispose(); resolve(); }, { once: true });
    });
  });
}

void boot().catch(() => {
  root.replaceChildren(element('p', 'notice error', msg('Vault could not start. Use HTTPS or localhost and allow browser storage.')));
});
// BFCache restores have lost their writer lock and must reinitialize.
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
