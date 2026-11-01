import { useState, type FormEvent } from 'react';
import { AppVersion } from '../components/AppVersion';
import { useAppStore } from '../store/useAppStore';
import { hasLegacyProgress } from '../lib/storage';

type Tab = 'login' | 'register';

export function AuthPage() {
  const { login, register } = useAppStore();
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const legacy = hasLegacyProgress();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const err =
        tab === 'login'
          ? await login(username, password)
          : await register(username, password);
      if (err) setError(err);
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
              <h1>Sign in to keep your progress</h1>
              <p className="lede">
                Create a username on this device. No email needed — your learning
                stats and word strength stay tied to your account in this browser.
              </p>

              {legacy && (
                <p className="auth-banner">
                  Previous anonymous progress was found. Sign up or log in and it
                  will be attached to your account automatically.
                </p>
              )}

              <div className="library-filters" style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn ${tab === 'login' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={`btn ${tab === 'register' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setTab('register');
                    setError(null);
                  }}
                >
                  Create account
                </button>
              </div>

              <form className="auth-form" onSubmit={(e) => void submit(e)}>
                <div className="field">
                  <label htmlFor="auth-username">Username</label>
                  <input
                    id="auth-username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={2}
                    placeholder="e.g. viktor"
                  />
                </div>
                <div className="field">
                  <label htmlFor="auth-password">Password</label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={
                      tab === 'login' ? 'current-password' : 'new-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder="At least 4 characters"
                  />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <div className="btn-row">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={busy}
                  >
                    {busy
                      ? 'Please wait…'
                      : tab === 'login'
                        ? 'Log in'
                        : 'Create account'}
                  </button>
                </div>
              </form>

              <p className="muted auth-note">
                Accounts are stored locally on this device only. Use Export in
                Settings to back up before clearing browser data or switching
                phones.
              </p>
              <AppVersion />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
