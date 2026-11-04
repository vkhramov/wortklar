import { useDeferredValue, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { interfaceLang, uiLangFromMode } from '../lib/leakage';
import { resolveIllustrationId } from '../lib/illustrations';
import { hasWordImage } from '../lib/wordImages';
import {
  getWordStats,
  statusLabel,
  type WordStatus,
} from '../lib/wordStats';
import { Illustration } from '../components/Illustration';
import { WordPhoto } from '../components/WordPhoto';
import type { CefrLevel, VocabEntry } from '../types/vocab';

type StatusFilter = 'all' | WordStatus;
type SortKey = 'alpha' | 'strength' | 'accuracy' | 'level';

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
const PAGE_SIZE = 60;

function matchesQuery(entry: VocabEntry, q: string): boolean {
  if (!q) return true;
  const hay = [
    entry.lemma,
    entry.article ?? '',
    entry.plural ?? '',
    ...entry.en,
    ...entry.ru,
    entry.id,
    ...entry.topics,
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((part) => hay.includes(part));
}

export function LibraryPage() {
  const { vocabulary, progress, applyGrade, resumeLearning } = useAppStore();
  const ui = interfaceLang(progress.settings);
  const study = uiLangFromMode(progress.settings.mode);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [levelFilter, setLevelFilter] = useState<CefrLevel | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('alpha');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const list = vocabulary
      .map((entry) => ({
        entry,
        stats: getWordStats(entry.id, progress.cards),
      }))
      .filter(({ entry, stats }) => {
        if (!matchesQuery(entry, deferredQuery)) return false;
        if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
        if (statusFilter !== 'all' && stats.status !== statusFilter) return false;
        return true;
      });

    list.sort((a, b) => {
      if (sortKey === 'strength') return b.stats.strength - a.stats.strength;
      if (sortKey === 'accuracy') {
        const aa = a.stats.accuracy ?? -1;
        const bb = b.stats.accuracy ?? -1;
        return bb - aa;
      }
      if (sortKey === 'level') {
        return (
          LEVELS.indexOf(a.entry.level) - LEVELS.indexOf(b.entry.level) ||
          a.entry.lemma.localeCompare(b.entry.lemma, 'de')
        );
      }
      return a.entry.lemma.localeCompare(b.entry.lemma, 'de');
    });
    return list;
  }, [vocabulary, progress.cards, deferredQuery, statusFilter, levelFilter, sortKey]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const entry = vocabulary.find((e) => e.id === selectedId);
    if (!entry) return null;
    return { entry, stats: getWordStats(entry.id, progress.cards) };
  }, [selectedId, vocabulary, progress.cards]);

  const summary = useMemo(() => {
    let studied = 0;
    let known = 0;
    let due = 0;
    for (const e of vocabulary) {
      const s = getWordStats(e.id, progress.cards);
      if (s.introduced) studied++;
      if (s.status === 'known') known++;
      if (s.status === 'due') due++;
    }
    return { studied, known, due, total: vocabulary.length };
  }, [vocabulary, progress.cards]);

  const statusFilters: { id: StatusFilter; en: string; ru: string }[] = [
    { id: 'all', en: 'All', ru: 'Все' },
    { id: 'due', en: 'Due', ru: 'К повторению' },
    { id: 'learning', en: 'Learning', ru: 'Изучается' },
    { id: 'review', en: 'Review', ru: 'Повторение' },
    { id: 'known', en: 'Known', ru: 'Знаю' },
    { id: 'new', en: 'New', ru: 'Новые' },
  ];

  const visible = rows.slice(0, limit);

  return (
    <div className="hero library-page">
      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Словарь' : 'Library'}</h2>
          <span className="muted">
            {ui === 'ru'
              ? `${summary.studied} из ${summary.total} начато`
              : `${summary.studied} of ${summary.total} started`}
          </span>
        </div>

        <div className="stat-row library-summary">
          <div className="stat">
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">{ui === 'ru' ? 'Всего' : 'Words'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{summary.studied}</div>
            <div className="stat-label">{ui === 'ru' ? 'В работе' : 'Studied'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{summary.due}</div>
            <div className="stat-label">{ui === 'ru' ? 'К повторению' : 'Due'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{summary.known}</div>
            <div className="stat-label">{ui === 'ru' ? 'Знаю' : 'Known'}</div>
          </div>
        </div>

        <div className="field" style={{ marginBottom: '0.7rem' }}>
          <label htmlFor="library-search">
            {ui === 'ru' ? 'Поиск' : 'Lookup'}
          </label>
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={
              ui === 'ru'
                ? 'Lemma, English, русский, тема…'
                : 'Lemma, English, Russian, topic…'
            }
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="library-filters">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn ${statusFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setStatusFilter(f.id);
                setLimit(PAGE_SIZE);
              }}
            >
              {ui === 'ru' ? f.ru : f.en}
            </button>
          ))}
        </div>

        <div className="library-filters" style={{ marginTop: '0.45rem' }}>
          <button
            type="button"
            className={`btn ${levelFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setLevelFilter('all')}
          >
            {ui === 'ru' ? 'Все уровни' : 'All levels'}
          </button>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`btn ${levelFilter === level ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setLevelFilter(level)}
            >
              {level}
            </button>
          ))}
          <label className="library-sort">
            <span className="muted">{ui === 'ru' ? 'Сортировка' : 'Sort'}</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="alpha">{ui === 'ru' ? 'А → Я' : 'A → Z'}</option>
              <option value="strength">
                {ui === 'ru' ? 'Сила' : 'Strength'}
              </option>
              <option value="accuracy">
                {ui === 'ru' ? 'Точность' : 'Accuracy'}
              </option>
              <option value="level">{ui === 'ru' ? 'Уровень' : 'Level'}</option>
            </select>
          </label>
        </div>
      </section>

      <div className={`library-layout ${selected ? 'has-detail' : ''}`}>
        <section className="panel library-list-panel">
          <div className="panel-title">
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
              {ui === 'ru' ? 'Слова' : 'Words'}
            </h3>
            <span className="muted">
              {rows.length === vocabulary.length
                ? rows.length
                : ui === 'ru'
                  ? `${rows.length} найдено`
                  : `${rows.length} found`}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state">
              {ui === 'ru' ? 'Ничего не найдено.' : 'No matching words.'}
            </div>
          ) : (
            <ul className="library-list">
              {visible.map(({ entry, stats }) => {
                const head =
                  entry.pos === 'noun' && entry.article
                    ? `${entry.article} ${entry.lemma}`
                    : entry.lemma;
                const gloss =
                  study === 'ru' ? entry.ru[0] ?? entry.en[0] : entry.en[0] ?? entry.ru[0];
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`library-row ${selectedId === entry.id ? 'active' : ''}`}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <div className="library-row-main">
                        <div className="library-lemma">{head}</div>
                        <div className="library-gloss">{gloss}</div>
                      </div>
                      <div className="library-row-meta">
                        <span className={`chip status-${stats.status}`}>
                          {statusLabel(stats.status, ui)}
                        </span>
                        <div
                          className="strength-bar"
                          title={
                            ui === 'ru'
                              ? `Сила ${stats.strength}%`
                              : `Strength ${stats.strength}%`
                          }
                          aria-label={
                            ui === 'ru'
                              ? `Сила ${stats.strength}%`
                              : `Strength ${stats.strength}%`
                          }
                        >
                          <span style={{ width: `${stats.strength}%` }} />
                        </div>
                        <span className="library-acc muted">
                          {stats.accuracy === null
                            ? '—'
                            : `${stats.accuracy}%`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {limit < rows.length && (
            <div className="btn-row" style={{ marginTop: '0.9rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                {ui === 'ru'
                  ? `Ещё (${rows.length - limit})`
                  : `Show more (${rows.length - limit})`}
              </button>
            </div>
          )}
        </section>

        {selected && (
          <>
          <button
            type="button"
            className="library-detail-backdrop"
            aria-label={ui === 'ru' ? 'Закрыть' : 'Close'}
            onClick={() => setSelectedId(null)}
          />
          <section className="panel library-detail">
            <div className="panel-title">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {!hasWordImage(selected.entry.id) && (
                  <Illustration id={resolveIllustrationId(selected.entry)} />
                )}
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                  {selected.entry.pos === 'noun' && selected.entry.article
                    ? `${selected.entry.article} ${selected.entry.lemma}`
                    : selected.entry.lemma}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedId(null)}
              >
                {ui === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>

            {hasWordImage(selected.entry.id) && (
              <div className="library-visuals">
                <WordPhoto
                  entryId={selected.entry.id}
                  alt={selected.entry.lemma}
                  size="lg"
                />
                <Illustration id={resolveIllustrationId(selected.entry)} />
              </div>
            )}

            <div className="meta-row" style={{ marginBottom: '0.75rem' }}>
              <span className="chip">{selected.entry.pos}</span>
              <span className="chip">{selected.entry.level}</span>
              <span className={`chip status-${selected.stats.status}`}>
                {statusLabel(selected.stats.status, ui)}
              </span>
              {hasWordImage(selected.entry.id) && (
                <span className="chip">
                  {ui === 'ru' ? 'фото' : 'photo'}
                </span>
              )}
            </div>

            <div className="library-detail-gloss">
              <div>
                <div className="example-label">English</div>
                <div>{selected.entry.en.join(' · ')}</div>
              </div>
              <div>
                <div className="example-label">Русский</div>
                <div>{selected.entry.ru.join(' · ')}</div>
              </div>
            </div>

            <div className="example-block" style={{ marginTop: '0.9rem' }}>
              <div className="example-label">
                {ui === 'ru' ? 'Пример' : 'Example'}
              </div>
              <div className="example-de">{selected.entry.example.de}</div>
              <div className="example-tr">
                {study === 'ru'
                  ? selected.entry.example.ru
                  : selected.entry.example.en}
              </div>
            </div>

            <div className="library-stats-grid">
              <div className="stat">
                <div className="stat-value">{selected.stats.strength}%</div>
                <div className="stat-label">
                  {ui === 'ru' ? 'Сила' : 'Strength'}
                </div>
                <div className="strength-bar strength-bar-lg">
                  <span style={{ width: `${selected.stats.strength}%` }} />
                </div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {selected.stats.accuracy === null
                    ? '—'
                    : `${selected.stats.accuracy}%`}
                </div>
                <div className="stat-label">
                  {ui === 'ru' ? 'Точность' : 'Accuracy'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-value ok-text">{selected.stats.correct}</div>
                <div className="stat-label">
                  {ui === 'ru' ? 'Верно' : 'Correct'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-value bad-text">{selected.stats.incorrect}</div>
                <div className="stat-label">
                  {ui === 'ru' ? 'Ошибки' : 'Wrong'}
                </div>
              </div>
            </div>

            <dl className="library-dl">
              <div>
                <dt>{ui === 'ru' ? 'Расписание' : 'Schedule'}</dt>
                <dd>{selected.stats.schedule}</dd>
              </div>
              <div>
                <dt>{ui === 'ru' ? 'Интервал' : 'Interval'}</dt>
                <dd>
                  {selected.stats.card.interval
                    ? ui === 'ru'
                      ? `${selected.stats.card.interval} дн.`
                      : `${selected.stats.card.interval} days`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>{ui === 'ru' ? 'Повторов' : 'Reviews'}</dt>
                <dd>{selected.stats.attempts}</dd>
              </div>
              <div>
                <dt>{ui === 'ru' ? 'Срывы' : 'Lapses'}</dt>
                <dd>{selected.stats.card.lapses}</dd>
              </div>
              <div>
                <dt>{ui === 'ru' ? 'Темы' : 'Topics'}</dt>
                <dd>{selected.entry.topics.join(', ')}</dd>
              </div>
              {selected.entry.plural && selected.entry.plural !== '-' && (
                <div>
                  <dt>{ui === 'ru' ? 'Мн. число' : 'Plural'}</dt>
                  <dd>{selected.entry.plural}</dd>
                </div>
              )}
            </dl>

            <div className="btn-row" style={{ marginTop: '1rem' }}>
              {selected.stats.status === 'known' ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => resumeLearning(selected.entry.id)}
                >
                  {ui === 'ru' ? 'Вернуть в изучение' : 'Return to learning'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => applyGrade(selected.entry.id, 'know')}
                >
                  {ui === 'ru' ? 'Отметить «Уже знаю»' : 'Mark as already know'}
                </button>
              )}
            </div>
          </section>
          </>
        )}
      </div>
    </div>
  );
}
