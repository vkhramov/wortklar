export type ColorTheme = 'light' | 'dark';

const KEY = 'wortklar-theme';

export function readTheme(): ColorTheme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: ColorTheme): void {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'dark' ? '#101614' : '#0c6b5c');
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
}
