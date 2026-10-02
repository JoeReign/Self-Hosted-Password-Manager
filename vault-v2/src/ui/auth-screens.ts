import { msg } from '../i18n/locale';
import { button, clearView, element, field } from './dom';

interface UnlockActions {
  attempt(action: () => Promise<void>): void;
  unlock(password: string): Promise<void>;
  openFile(): void;
  create(): void;
  recover(): Promise<void>;
}

export function renderUnlockScreen(root: HTMLElement, hasSavedVault: boolean, actions: UnlockActions): void {
  clearView(root);
  root.className = 'locked-shell';
  const card = element('section', 'unlock-card');
  card.append(element('div', 'brand', msg('V / LOCAL VAULT')), element('h1', '', msg('Your secrets.\nYour device.')),
    element('p', 'muted', msg('Your vault is encrypted on this device. No vault data is uploaded.')));
  if (hasSavedVault) {
    const form = element('form');
    const password = field(msg('Master passphrase'), 'password');
    password.input.autocomplete = 'current-password';
    password.input.required = true;
    const submit = element('button', 'button primary', msg('Unlock saved vault'));
    submit.type = 'submit';
    form.append(password.wrapper, submit);
    form.onsubmit = event => {
      event.preventDefault();
      actions.attempt(async () => {
        await actions.unlock(password.input.value);
        password.input.value = '';
      });
    };
    card.append(form);
  }
  card.append(button(hasSavedVault ? msg('Open a different vault file') : msg('Open existing JSON'), actions.openFile),
    button(msg('Create a new vault'), actions.create, 'button subtle'),
    button(msg('Recover previous browser snapshot'), () => actions.attempt(actions.recover), 'button subtle'),
    element('p', 'footnote', msg('Locks after 5 minutes of inactivity. Browser storage is not a backup: export a file regularly.')));
  root.append(card);
}

interface SetupOptions {
  mode: 'new' | 'import';
  recovery: boolean;
  attempt(action: () => Promise<void>): void;
  submit(password: string, confirmation: string, file?: File): Promise<void>;
  back(): Promise<void>;
}

export function renderSetupScreen(root: HTMLElement, options: SetupOptions): void {
  clearView(root);
  const card = element('section', 'unlock-card');
  card.append(element('div', 'brand', msg('V / LOCAL VAULT')),
    element('h1', '', options.mode === 'new' ? msg('Start your vault.') : msg('Bring your vault.')),
    element('p', 'muted', options.mode === 'new' ? msg('Use a long, unique passphrase. There is no password reset.') :
      msg('Open v1/v2 encrypted JSON with its existing password, or protect legacy plaintext JSON with a new passphrase.')));
  const form = element('form');
  const file = field(msg('Vault JSON file'), 'file');
  file.input.accept = '.json,application/json';
  file.input.required = true;
  const pass = field(options.mode === 'new' ? msg('New master passphrase (14+ characters)') : msg('Master passphrase'), 'password');
  pass.input.required = true;
  pass.input.autocomplete = options.mode === 'new' ? 'new-password' : 'current-password';
  const confirmation = field(msg('Confirm passphrase'), 'password');
  confirmation.input.autocomplete = 'new-password';
  if (options.mode === 'import' && !options.recovery) form.append(file.wrapper);
  form.append(pass.wrapper);
  if (options.mode === 'new') {
    pass.input.minLength = 14;
    confirmation.input.required = true;
    form.append(confirmation.wrapper);
  }
  const submit = element('button', 'button primary', options.mode === 'new' ? msg('Create encrypted vault') : msg('Unlock and import'));
  submit.type = 'submit';
  form.append(submit);
  form.onsubmit = event => {
    event.preventDefault();
    options.attempt(async () => {
      await options.submit(pass.input.value, confirmation.input.value, file.input.files?.[0]);
      pass.input.value = '';
      confirmation.input.value = '';
      file.input.value = '';
    });
  };
  card.append(form, button(msg('Back'), () => options.attempt(options.back), 'button subtle'));
  root.append(card);
}
