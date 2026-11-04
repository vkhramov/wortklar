import { useState, type FormEvent } from 'react';
import { AppVersion } from '../components/AppVersion';
import { useAppStore } from '../store/useAppStore';
import { hasLegacyProgress } from '../lib/storage';
import { readShellLang, writeShellLang, type ShellLang } from '../lib/shellLang';

type Tab = 'login' | 'register';

function localizeAuthError(error: string, ru: boolean): string {
  if (!ru) return error;
  const map: Record<string, string> = {
    'Username must be at least 2 characters.': 'Имя — минимум 2 символа.',
    'Use letters, numbers, dots, underscores, or hyphens.':
      'Только буквы, цифры, точки, подчёркивания и дефисы.',
    'Password must be at least 4 characters.': 'Пароль — минимум 4 символа.',
    'That username is already taken on this device.': 'Это имя уже занято на этом устройстве.',
    'Incorrect password.': 'Неверный пароль.',
  };
  return map[error] ?? error;
}

export function AuthPage() {
  const { login, register } = useAppStore();
  const [ui, setUi] = useState<ShellLang>(() => readShellLang());
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const legacy = hasLegacyProgress();
  const ru = ui === 'ru';

  function chooseLang(lang: ShellLang) {
    writeShellLang(lang);
    setUi(lang);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const err =
        tab === 'login'
          ? await login(username, password)
          : await register(username, password);
      if (err) setError(localizeAuthError(err, ru));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="page">
        <div className="container">
          <div className="hero auth-hero">
            <section className="hero-panel auth-panel">
              <div className="eyebrow">Wortklar</div>
              <div className="btn-row auth-tabs" role="group" aria-label={ru ? 'Язык' : 'Language'}>
                <button
                  type="button"
                  className={`btn ${ru ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => chooseLang('ru')}
                >
                  Русский
                </button>
                <button
                  type="button"
                  className={`btn ${ru ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => chooseLang('en')}
                >
                  English
                </button>
              </div>
              <h1>{ru ? 'Войдите, чтобы заниматься' : 'Sign in to study'}</h1>
              <p className="lede">
                {ru
                  ? 'Один и тот же логин на телефоне и компьютере. Почта не нужна.'
                  : 'The same login on your phone and computer. No email needed.'}
              </p>

              {legacy && (
                <p className="auth-banner">
                  {ru
                    ? 'Найден прошлый прогресс без аккаунта. Войдите, и он привяжется к этому логину.'
                    : 'Previous progress without an account was found. Sign in and it will be attached to this login.'}
                </p>
              )}

              <div className="btn-row auth-tabs" role="group" aria-label={ru ? 'Вход' : 'Sign in'}>
                <button
                  type="button"
                  className={`btn ${tab === 'login' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                >
                  {ru ? 'Войти' : 'Log in'}
                </button>
                <button
                  type="button"
                  className={`btn ${tab === 'register' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setTab('register');
                    setError(null);
                  }}
                >
                  {ru ? 'Создать' : 'Create account'}
                </button>
              </div>

              <form className="auth-form" onSubmit={(e) => void submit(e)}>
                <div className="field">
                  <label htmlFor="auth-username">{ru ? 'Имя' : 'Username'}</label>
                  <input
                    id="auth-username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={2}
                    placeholder={ru ? 'Минимум 2 символа' : 'At least 2 characters'}
                  />
                </div>
                <div className="field">
                  <label htmlFor="auth-password">{ru ? 'Пароль' : 'Password'}</label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder={ru ? 'Минимум 4 символа' : 'At least 4 characters'}
                  />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <div className="btn-row">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy
                      ? ru
                        ? 'Секунду…'
                        : 'Please wait…'
                      : tab === 'login'
                        ? ru
                          ? 'Войти'
                          : 'Log in'
                        : ru
                          ? 'Создать аккаунт'
                          : 'Create account'}
                  </button>
                </div>
              </form>

              <p className="muted auth-note">
                {ru
                  ? 'Прогресс с другого устройства подтягивается потом: Настройки → синхронизация GitHub → Pull.'
                  : 'Progress from another device comes later: Settings → GitHub sync → Pull.'}
              </p>
              <AppVersion />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
