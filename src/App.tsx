import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { GapFillPage } from './pages/GapFillPage';
import { LearnPage } from './pages/LearnPage';
import { LibraryPage } from './pages/LibraryPage';
import { MorePage } from './pages/MorePage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { TranslatePage } from './pages/TranslatePage';
import { readShellLang, writeShellLang } from './lib/shellLang';
import { prefetchSpeechVoices } from './lib/speech';
import { applyTheme, readTheme } from './lib/theme';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const { ready, user, init, progress } = useAppStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    prefetchSpeechVoices();
  }, []);

  useEffect(() => {
    applyTheme(user ? progress.settings.theme : readTheme());
  }, [user, progress.settings.theme]);

  useEffect(() => {
    if (!user) return;
    writeShellLang(progress.settings.uiLang);
  }, [user, progress.settings.uiLang]);

  if (!ready) {
    const ui = readShellLang();
    return (
      <div className="app-shell">
        <div className="container" style={{ padding: '3rem 0' }}>
          <div className="panel empty-state">{ui === 'ru' ? 'Открываю…' : 'Opening…'}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="gaps" element={<GapFillPage />} />
          <Route path="translate" element={<TranslatePage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
