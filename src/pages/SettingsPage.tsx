import { useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CefrLevel } from '../types/vocab';
import { interfaceLang } from '../lib/leakage';
import {
  getProgressPat,
  getProgressRepo,
  setProgressPat,
  setProgressRepo,
} from '../lib/progressSync';
import { getGeminiKey, setGeminiKey } from '../lib/translate';
import { topicLabel } from '../lib/topicLabels';

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
    syncStatus,
    updateSettings,
    resetProgress,
    exportData,
    importData,
    logout,
    syncPull,
    syncPush,
  } = useAppStore();
  const s = progress.settings;
  const ui = interfaceLang(s);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pat, setPat] = useState(() => getProgressPat());
  const [repo, setRepo] = useState(() => getProgressRepo());
  const [patSaved, setPatSaved] = useState(false);
  const [geminiKey, setGeminiKeyValue] = useState(() => getGeminiKey());
  const [geminiSaved, setGeminiSaved] = useState(false);

  function toggleLevel(level: CefrLevel) {
    const levels = s.levels.includes(level)
      ? s.levels.filter((l) => l !== level)
      : [...s.levels, level];
    updateSettings({ levels: levels.length ? levels : [...ALL_LEVELS] });
  }

  function toggleTopic(topic: string) {
    const current = s.topics.length === 0 ? [...TOPICS] : s.topics;
    const topics = current.includes(topic)
      ? current.filter((t) => t !== topic)
      : [...current, topic];
    if (topics.length === 0) return;
    updateSettings({ topics: topics.length === TOPICS.length ? [] : topics });
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
          <h2>{ui === 'ru' ? 'Язык интерфейса' : 'Interface language'}</h2>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className={`btn ${s.uiLang === 'ru' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ uiLang: 'ru' })}
          >
            Русский
          </button>
          <button
            type="button"
            className={`btn ${s.uiLang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ uiLang: 'en' })}
          >
            English
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Оформление' : 'Appearance'}</h2>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className={`btn ${s.theme !== 'dark' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ theme: 'light' })}
          >
            {ui === 'ru' ? 'Светлая' : 'Light'}
          </button>
          <button
            type="button"
            className={`btn ${s.theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ theme: 'dark' })}
          >
            {ui === 'ru' ? 'Тёмная' : 'Dark'}
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

        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {ui === 'ru'
            ? 'Примеры в gap-fill — из Tatoeba и ваших A1–B1 текстов (личная библиотека).'
            : 'Gap-fill examples come from Tatoeba and your A1–B1 graded readers (personal library).'}
        </p>
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
            className={`btn ${s.topics.length === 0 ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ topics: [] })}
          >
            {ui === 'ru' ? 'Все темы' : 'All topics'}
          </button>
        </div>
        <div className="btn-row">
          {TOPICS.map((topic) => {
            const on = s.topics.length === 0 || s.topics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                className={`btn ${s.topics.length > 0 && on ? 'btn-secondary' : 'btn-ghost'}`}
                aria-pressed={on}
                onClick={() => toggleTopic(topic)}
              >
                {topicLabel(topic, ui)}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {s.topics.length === 0
            ? ui === 'ru'
              ? 'Сейчас включены все темы. Нажмите тему, чтобы выключить только её.'
              : 'All topics are on. Tap a topic to turn that one off.'
            : ui === 'ru'
              ? 'Серым показаны выключенные темы. «Все темы» возвращает полный список.'
              : 'Ghost buttons are off. “All topics” turns the full list back on.'}
        </p>
      </section>

      <details className="fold">
        <summary>{ui === 'ru' ? 'Перевод (Gemini)' : 'Translation (Gemini)'}</summary>
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
          {ui === 'ru'
            ? 'Ключ из Google AI Studio хранится только в этом браузере и нужен для упражнения Write. На бесплатном тарифе Google может использовать запросы для улучшения моделей.'
            : 'A Google AI Studio key stays in this browser and powers the Write exercise. On the free tier, Google may use requests to improve its models.'}
        </p>
        <div className="field">
          <label htmlFor="gemini-key">Gemini API key</label>
          <input
            id="gemini-key"
            type="password"
            value={geminiKey}
            onChange={(e) => {
              setGeminiKeyValue(e.target.value);
              setGeminiSaved(false);
            }}
            placeholder="AIza…"
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setGeminiKey(geminiKey);
            setGeminiSaved(true);
          }}
        >
          {ui === 'ru' ? 'Сохранить ключ' : 'Save key'}
        </button>
        {geminiSaved && (
          <p className="muted">
            {ui === 'ru' ? 'Ключ сохранён на этом устройстве.' : 'Key saved on this device.'}
          </p>
        )}
      </details>

      <details className="fold">
        <summary>{ui === 'ru' ? 'Синхронизация (GitHub)' : 'Sync (GitHub)'}</summary>
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
          {ui === 'ru'
            ? 'Приватный репозиторий хранит прогресс. PAT остаётся только в этом браузере. На новом устройстве: тот же логин Wortklar + тот же PAT → Pull.'
            : 'A private repo stores your progress. The PAT stays in this browser only. On a new device: same Wortklar login + same PAT → Pull.'}
        </p>
        <div className="field">
          <label htmlFor="gh-repo">
            {ui === 'ru' ? 'Репозиторий' : 'Repository'}
          </label>
          <input
            id="gh-repo"
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="vkhramov/wortklar-progress"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="gh-pat">
            {ui === 'ru' ? 'GitHub PAT (fine-grained)' : 'GitHub PAT (fine-grained)'}
          </label>
          <input
            id="gh-pat"
            type="password"
            value={pat}
            onChange={(e) => {
              setPat(e.target.value);
              setPatSaved(false);
            }}
            placeholder="github_pat_…"
            autoComplete="off"
          />
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setProgressRepo(repo);
              setProgressPat(pat);
              setPatSaved(true);
            }}
          >
            {ui === 'ru' ? 'Сохранить PAT' : 'Save PAT'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={syncStatus.state === 'syncing'}
            onClick={() => void syncPull()}
          >
            {ui === 'ru' ? 'Pull' : 'Pull'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={syncStatus.state === 'syncing'}
            onClick={() => void syncPush()}
          >
            {ui === 'ru' ? 'Push' : 'Push'}
          </button>
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {patSaved
            ? ui === 'ru'
              ? 'PAT сохранён на этом устройстве.'
              : 'PAT saved on this device.'
            : null}{' '}
          {syncStatus.state === 'idle'
            ? null
            : syncStatus.state === 'syncing'
              ? syncStatus.detail
              : syncStatus.state === 'ok'
                ? `${syncStatus.detail}${syncStatus.at ? ` · ${new Date(syncStatus.at).toLocaleString()}` : ''}`
                : syncStatus.detail}
        </p>
      </details>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Данные' : 'Data'}</h2>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {ui === 'ru'
            ? 'Локальная копия в браузере. Экспорт — запасной вариант без GitHub.'
            : 'Local browser copy. Export is a fallback without GitHub.'}
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
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{ui === 'ru' ? 'Сброс' : 'Reset'}</h2>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {ui === 'ru'
            ? 'Удаляет карточки и статистику на этом устройстве. Аккаунт и ключи остаются.'
            : 'Deletes cards and stats on this device. The account and keys stay.'}
        </p>
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
      </section>
    </div>
  );
}
