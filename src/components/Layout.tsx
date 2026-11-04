import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { uiLangFromMode } from '../lib/leakage';
import { useAppStore } from '../store/useAppStore';
import { AppVersion } from './AppVersion';

export function Layout() {
  const { user, logout, progress } = useAppStore();
  const ui = uiLangFromMode(progress.settings.mode);
  const { pathname } = useLocation();
  const ru = ui === 'ru';

  const desktopLinks = [
    { to: '/', label: ru ? 'Дом' : 'Home', end: true },
    { to: '/learn', label: ru ? 'Слова' : 'Words' },
    { to: '/gaps', label: ru ? 'Пропуски' : 'Gaps' },
    { to: '/translate', label: ru ? 'Письмо' : 'Write' },
    { to: '/library', label: ru ? 'Словарь' : 'Library' },
    { to: '/progress', label: ru ? 'Прогресс' : 'Progress' },
    { to: '/settings', label: ru ? 'Настройки' : 'Settings' },
  ];

  const mobileLinks = [
    { to: '/learn', label: ru ? 'Слова' : 'Words' },
    { to: '/gaps', label: ru ? 'Пропуски' : 'Gaps' },
    { to: '/translate', label: ru ? 'Письмо' : 'Write' },
    { to: '/library', label: ru ? 'Словарь' : 'Library' },
    { to: '/more', label: ru ? 'Ещё' : 'More' },
  ];

  const moreActive = ['/more', '/progress', '/settings'].includes(pathname);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand" aria-label="Wortklar home">
            <span className="brand-mark" aria-hidden>
              W
            </span>
            <span className="brand-text">Wortklar</span>
          </NavLink>
          <div className="topbar-right">
            {user && (
              <div className="account-chip" title={user.username}>
                <span className="account-name">{user.username}</span>
                <button
                  type="button"
                  className="btn btn-ghost account-logout"
                  onClick={() => logout()}
                >
                  {ru ? 'Выйти' : 'Log out'}
                </button>
              </div>
            )}
            <nav className="nav" aria-label="Main">
              {desktopLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="container">
          <Outlet />
          <AppVersion />
        </div>
      </main>

      <nav className="bottom-nav" aria-label={ru ? 'Разделы' : 'Mobile'}>
        <div className="bottom-nav-inner">
          {mobileLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                (l.to === '/more' ? moreActive : isActive) ? 'active' : undefined
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
