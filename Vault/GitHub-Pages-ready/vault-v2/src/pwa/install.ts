interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class InstallController {
  private prompt: InstallPrompt | null = null;
  private events = new AbortController();

  constructor(private install: HTMLButtonElement, private help: () => void) {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      this.prompt = event as InstallPrompt;
      this.install.textContent = 'Install app';
    }, { signal: this.events.signal });
    window.addEventListener('appinstalled', () => {
      this.prompt = null;
      this.install.textContent = 'App installed';
    }, { signal: this.events.signal });
    this.install.addEventListener('click', () => { void this.run(); }, { signal: this.events.signal });
  }

  dispose(): void { this.events.abort(); this.prompt = null; }

  private async run(): Promise<void> {
    const prompt = this.prompt;
    this.prompt = null;
    if (!prompt) { this.help(); return; }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome !== 'accepted') this.help();
    } catch { this.help(); }
  }
}
