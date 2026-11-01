import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { countStats } from '../lib/session';
import { todayKey } from '../lib/storage';
import { uiLangFromMode } from '../lib/leakage';

export function ProgressPage() {
  const { vocabulary, progress } = useAppStore();
  const ui = uiLangFromMode(progress.settings.mode);
  const stats = countStats(vocabulary, progress);
  const today = progress.daily.find((d) => d.date === todayKey());

  const byTopic = useMemo(() => {
    const map = new Map<string, { total: number; seen: number }>();
    for (const e of vocabulary) {
      for (const t of e.topics) {
        const row = map.get(t) ?? { total: 0, seen: 0 };
        row.total++;
        const card = progress.cards[e.id];
        if (card?.introducedAt) row.seen++;
        map.set(t, row);
      }
    }
    return [...map.entries()]
      .map(([topic, v]) => ({
        topic,
        ...v,
        pct: v.total ? Math.round((v.seen / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct || a.topic.localeCompare(b.topic));
  }, [vocabulary, progress.cards]);

  const last7 = useMemo(() => {
    const days: { date: string; done: number; accuracy: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = progress.daily.find((x) => x.date === key);
      const total = (row?.correct ?? 0) + (row?.incorrect ?? 0);
      days.push({
        date: key.slice(5),
        done: row?.reviewsDone ?? 0,
        accuracy: total ? Math.round(((row?.correct ?? 0) / total) * 100) : 0,
      });
    }
    return days;
  }, [progress.daily]);

  const lifetimeCorrect = progress.daily.reduce((s, d) => s + d.correct, 0);
  const lifetimeWrong = progress.daily.reduce((s, d) => s + d.incorrect, 0);
  const accuracy =
    lifetimeCorrect + lifetimeWrong
      ? Math.round((lifetimeCorrect / (lifetimeCorrect + lifetimeWrong)) * 100)
      : 0;

  return (
    <div className="hero">
      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Прогресс' : 'Progress'}</h2>
          <span className="muted">
            {ui === 'ru' ? `Серия: ${progress.streak} дн.` : `Streak: ${progress.streak} days`}
          </span>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-value">{stats.learned}</div>
            <div className="stat-label">{ui === 'ru' ? 'Изучается' : 'Learning'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.reviewing}</div>
            <div className="stat-label">{ui === 'ru' ? 'На повторении' : 'In review'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.due}</div>
            <div className="stat-label">{ui === 'ru' ? 'К повторению' : 'Due'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.notStarted}</div>
            <div className="stat-label">{ui === 'ru' ? 'Ещё не начато' : 'Not started'}</div>
          </div>
        </div>
        <div className="stat-row" style={{ marginTop: '0.75rem' }}>
          <div className="stat">
            <div className="stat-value">{stats.known}</div>
            <div className="stat-label">{ui === 'ru' ? 'Уже знаю' : 'Already know'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{today?.reviewsDone ?? 0}</div>
            <div className="stat-label">{ui === 'ru' ? 'Сегодня' : 'Today'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label">{ui === 'ru' ? 'Точность' : 'Accuracy'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{vocabulary.length}</div>
            <div className="stat-label">{ui === 'ru' ? 'В базе' : 'In library'}</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Последние 7 дней' : 'Last 7 days'}</h2>
        </div>
        <div className="stat-row">
          {last7.map((d) => (
            <div className="stat" key={d.date}>
              <div className="stat-value">{d.done}</div>
              <div className="stat-label">
                {d.date}
                {d.done ? ` · ${d.accuracy}%` : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'По темам' : 'By topic'}</h2>
        </div>
        <div className="topic-progress">
          {byTopic.slice(0, 24).map((t) => (
            <div className="topic-row" key={t.topic}>
              <span>{t.topic}</span>
              <div className="topic-bar">
                <span style={{ width: `${t.pct}%` }} />
              </div>
              <span className="muted">
                {t.seen}/{t.total}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
