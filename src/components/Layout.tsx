import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { AppVersion } from './AppVersion';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/learn', label: 'Learn' },
  { to: '/gaps', label: 'Gaps' },
  { to: '/library', label: 'Library' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  const { user, logout } = useAppStore();

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
                  Log out
                </button>
              </div>
            )}
            <nav className="nav" aria-label="Main">
              {links.map((l) => (
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

      <nav className="bottom-nav" aria-label="Mobile">
        <div className="bottom-nav-inner">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
