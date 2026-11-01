import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { countStats } from '../lib/session';
import { todayKey } from '../lib/storage';

const MODES = [
  { id: 'en-de' as const, title: 'English → German', blurb: 'Produce German from English' },
  { id: 'ru-de' as const, title: 'Russian → German', blurb: 'Produce German from Russian' },
  { id: 'de-en' as const, title: 'German → English', blurb: 'Understand German in English' },
  { id: 'de-ru' as const, title: 'German → Russian', blurb: 'Understand German in Russian' },
];

export function HomePage() {
  const { vocabulary, progress, setMode } = useAppStore();
  const stats = countStats(vocabulary, progress);
  const today = progress.daily.find((d) => d.date === todayKey());
  const doneToday = (today?.reviewsDone ?? 0);
  const goal = progress.settings.dailyGoal;

  return (
    <div className="hero">
      <section className="hero-panel">
        <div className="eyebrow">Everyday German that sticks</div>
        <h1>Wortklar</h1>
        <p className="lede">
          Learn practical German vocabulary with active recall, honest spacing,
          and grammar that shows up only when it helps — never before you answer.
        </p>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-value">{doneToday}/{goal}</div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.due}</div>
            <div className="stat-label">Due now</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.learned}</div>
            <div className="stat-label">In progress</div>
          </div>
          <div className="stat">
            <div className="stat-value">{progress.streak}</div>
            <div className="stat-label">Day streak</div>
          </div>
        </div>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/learn">
            Start session
          </Link>
          <Link className="btn btn-secondary" to="/library">
            Browse library
          </Link>
          <Link className="btn btn-ghost" to="/progress">
            View progress
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Learning direction</h2>
          <span className="muted">Strict language separation</span>
        </div>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mode-card ${progress.settings.mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <strong>{m.title}</strong>
              <span>{m.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>How sessions work</h2>
        </div>
        <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Each session mixes due reviews with new words (about 40% reviews when
          possible). Type your answer, press Enter, then study the example and
          grammar. Mark “Already know” to skip a word as new material without
          losing later review access.
        </p>
        <p className="muted" style={{ margin: '0.75rem 0 0', lineHeight: 1.55 }}>
          Library:{' '}
          <Link to="/library" style={{ color: 'var(--brand)', fontWeight: 600 }}>
            {vocabulary.length} curated entries
          </Link>{' '}
          · local-only progress · no account required.
        </p>
      </section>
    </div>
  );
}
