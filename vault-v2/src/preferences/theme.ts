export const THEMES = ['system', 'light', 'dark', 'cyberpunk', 'forest'] as const;
export type ThemePreference = typeof THEMES[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;
const STORAGE_KEY = 'local-vault-theme';

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

export class ThemeController {
  private preference: ThemePreference = 'system';
  private media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (THEMES.includes(saved as ThemePreference)) this.preference = saved as ThemePreference;
    } catch { /* Theme selection still works when preference storage is unavailable. */ }
    this.media.addEventListener('change', this.apply);
    this.apply();
  }

  current(): ThemePreference { return this.preference; }

  set(preference: ThemePreference): void {
    this.preference = preference;
    try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* Non-sensitive preference only. */ }
    this.apply();
  }

  dispose(): void { this.media.removeEventListener('change', this.apply); }

  private apply = (): void => {
    const theme = resolveTheme(this.preference, this.media.matches);
    document.documentElement.dataset.theme = theme;
    const colors = { light: '#f5f6fa', dark: '#10131d', cyberpunk: '#09081b', forest: '#101715' };
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[theme]);
  };
}
