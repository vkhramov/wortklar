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
import { prefetchSpeechVoices } from './lib/speech';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const { ready, user, init } = useAppStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    prefetchSpeechVoices();
  }, []);

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="container" style={{ padding: '3rem 0' }}>
          <div className="panel empty-state">Loading Wortklar…</div>
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
