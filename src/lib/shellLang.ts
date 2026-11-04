export type ShellLang = 'ru' | 'en';

const KEY = 'wortklar-ui';

export function readShellLang(): ShellLang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* private mode */
  }
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function writeShellLang(lang: ShellLang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* private mode */
  }
}
