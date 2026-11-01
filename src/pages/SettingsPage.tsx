import { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CefrLevel } from '../types/vocab';
import { uiLangFromMode } from '../lib/leakage';

const ALL_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
const TOPICS = [
  'basics', 'people', 'family', 'home', 'housing', 'food', 'drink', 'shopping',
  'transport', 'work', 'health', 'time', 'weather', 'nature', 'hobbies', 'travel',
  'emotions', 'education', 'technology', 'clothing', 'city', 'money', 'cooking',
  'sports', 'animals', 'body', 'descriptions', 'daily-life', 'communication',
  'appointments', 'relationships', 'grammar-essentials', 'phrases',
];

export function SettingsPage() {
  const {
    progress,
    user,
    updateSettings,
    resetProgress,
    exportData,
    importData,
    logout,
  } = useAppStore();
  const s = progress.settings;
  const ui = uiLangFromMode(s.mode);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleLevel(level: CefrLevel) {
    const levels = s.levels.includes(level)
      ? s.levels.filter((l) => l !== level)
      : [...s.levels, level];
    updateSettings({ levels: levels.length ? levels : [...ALL_LEVELS] });
  }

  function toggleTopic(topic: string) {
    const topics = s.topics.includes(topic)
      ? s.topics.filter((t) => t !== topic)
      : [...s.topics, topic];
    updateSettings({ topics });
  }

  return (
    <div className="hero">
      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Аккаунт' : 'Account'}</h2>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {ui === 'ru'
            ? `Вы вошли как «${user?.username ?? '—'}». Прогресс сохраняется на этом устройстве для вашего аккаунта.`
            : `Signed in as “${user?.username ?? '—'}”. Progress is saved on this device for your account.`}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => logout()}>
            {ui === 'ru' ? 'Выйти' : 'Log out'}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Настройки обучения' : 'Study settings'}</h2>
        </div>

        <div className="field">
          <label htmlFor="goal">{ui === 'ru' ? 'Дневная цель (карточек)' : 'Daily goal (cards)'}</label>
          <input
            id="goal"
            type="number"
            min={10}
            max={200}
            value={s.dailyGoal}
            onChange={(e) => updateSettings({ dailyGoal: Number(e.target.value) || 30 })}
          />
        </div>

        <div className="field">
          <label htmlFor="session">
            {ui === 'ru' ? 'Размер сессии' : 'Session size'}
          </label>
          <input
            id="session"
            type="number"
            min={10}
            max={80}
            value={s.sessionSize}
            onChange={(e) =>
              updateSettings({ sessionSize: Number(e.target.value) || 30 })
            }
          />
        </div>

        <div className="field">
          <label htmlFor="news">
            {ui === 'ru' ? 'Новых слов за сессию (макс.)' : 'Max new words per session'}
          </label>
          <input
            id="news"
            type="number"
            min={0}
            max={40}
            value={s.newPerSession}
            onChange={(e) =>
              updateSettings({ newPerSession: Number(e.target.value) || 0 })
            }
          />
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={s.showUmlautButtons}
              onChange={(e) => updateSettings({ showUmlautButtons: e.target.checked })}
            />{' '}
            {ui === 'ru' ? 'Кнопки умляутов' : 'Umlaut helper buttons'}
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>CEFR</h2>
          <span className="muted">{ui === 'ru' ? 'Фильтр уровней' : 'Level filter'}</span>
        </div>
        <div className="btn-row">
          {ALL_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`btn ${s.levels.includes(level) ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => toggleLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Темы' : 'Topics'}</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => updateSettings({ topics: [] })}
          >
            {ui === 'ru' ? 'Все темы' : 'All topics'}
          </button>
        </div>
        <div className="btn-row">
          {TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`btn ${s.topics.includes(topic) || s.topics.length === 0 ? 'btn-secondary' : 'btn-ghost'}`}
              style={{
                opacity: s.topics.length === 0 || s.topics.includes(topic) ? 1 : 0.45,
              }}
              onClick={() => toggleTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {ui === 'ru'
            ? 'Пустой выбор = все темы. Нажмите тему, чтобы сузить.'
            : 'Empty selection = all topics. Tap topics to narrow.'}
        </p>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Данные' : 'Data'}</h2>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {ui === 'ru'
            ? 'Прогресс привязан к аккаунту в этом браузере. Экспортируйте резервную копию перед сменой устройства.'
            : 'Progress is tied to your account in this browser. Export a backup before switching devices.'}
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const blob = new Blob([exportData()], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `wortklar-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {ui === 'ru' ? 'Экспорт' : 'Export backup'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
          >
            {ui === 'ru' ? 'Импорт' : 'Import backup'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              importData(text);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (
                confirm(
                  ui === 'ru'
                    ? 'Сбросить весь прогресс?'
                    : 'Reset all learning progress?',
                )
              ) {
                resetProgress();
              }
            }}
          >
            {ui === 'ru' ? 'Сбросить прогресс' : 'Reset progress'}
          </button>
        </div>
      </section>
    </div>
  );
}
