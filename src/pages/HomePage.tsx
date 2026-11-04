import { Link } from 'react-router-dom';
import { uiLangFromMode } from '../lib/leakage';
import { countStats } from '../lib/session';
import { todayKey } from '../lib/storage';
import { useAppStore } from '../store/useAppStore';

const MODES = [
  { id: 'en-de' as const, en: 'English → German', ru: 'Английский → немецкий' },
  { id: 'ru-de' as const, en: 'Russian → German', ru: 'Русский → немецкий' },
  { id: 'de-en' as const, en: 'German → English', ru: 'Немецкий → английский' },
  { id: 'de-ru' as const, en: 'German → Russian', ru: 'Немецкий → русский' },
];

export function HomePage() {
  const { vocabulary, progress, setMode } = useAppStore();
  const ui = uiLangFromMode(progress.settings.mode);
  const stats = countStats(vocabulary, progress);
  const today = progress.daily.find((d) => d.date === todayKey());
  const doneToday = today?.reviewsDone ?? 0;
  const goal = progress.settings.dailyGoal;
  const started = doneToday > 0;

  return (
    <div className="hero">
      <section className="hero-panel">
        <div className="eyebrow">{ui === 'ru' ? 'Сегодня' : 'Today'}</div>
        <h1>
          {doneToday}/{goal}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {ui === 'ru'
            ? `${stats.due} к повторению · серия ${progress.streak}`
            : `${stats.due} due · ${progress.streak} day streak`}
        </p>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/learn">
            {started
              ? ui === 'ru'
                ? 'Продолжить'
                : 'Continue'
              : ui === 'ru'
                ? 'Начать'
                : 'Start'}
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Направление' : 'Direction'}</h2>
        </div>
        <div className="btn-row">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`btn mode-choice ${progress.settings.mode === m.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode(m.id)}
            >
              {ui === 'ru' ? m.ru : m.en}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
