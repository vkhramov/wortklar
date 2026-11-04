import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { interfaceLang } from '../lib/leakage';

export function MorePage() {
  const { progress, logout } = useAppStore();
  const ui = interfaceLang(progress.settings);
  const items = [
    {
      to: '/progress',
      title: ui === 'ru' ? 'Прогресс' : 'Progress',
      detail: ui === 'ru' ? 'Серия, точность и темы' : 'Streak, accuracy, and topics',
    },
    {
      to: '/settings',
      title: ui === 'ru' ? 'Настройки' : 'Settings',
      detail: ui === 'ru' ? 'Цель, темы, ключ и синхронизация' : 'Goal, topics, key, and sync',
    },
  ];

  return (
    <div className="hero">
      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Ещё' : 'More'}</h2>
        </div>
        <div className="more-list">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="more-link">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </Link>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => logout()}>
            {ui === 'ru' ? 'Выйти' : 'Log out'}
          </button>
        </div>
      </section>
    </div>
  );
}
