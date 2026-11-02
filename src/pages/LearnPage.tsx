import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { buildSession } from '../lib/session';
import { evaluateAnswer, producesGerman } from '../lib/answer';
import { exampleBeforeAnswer } from '../lib/example';
import { buildReveal, buildSafePrompt, uiLangFromMode } from '../lib/leakage';
import { AnswerField } from '../components/AnswerField';
import { Illustration } from '../components/Illustration';
import type { AnswerResult, SessionItem } from '../types/vocab';
import type { Grade } from '../lib/srs';

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

type GradeAction = {
  id: string;
  label: string;
  className: string;
  run: () => void;
};

export function LearnPage() {
  const { vocabulary, progress, applyGrade, recordAnswer } = useAppStore();
  const mode = progress.settings.mode;
  const ui = uiLangFromMode(mode);

  const [session, setSession] = useState<SessionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [actionIndex, setActionIndex] = useState(0);

  useEffect(() => {
    const items = buildSession(vocabulary, progress);
    setSession(items);
    setIndex(0);
    setAnswer('');
    setResult(null);
    setFinished(items.length === 0);
  }, [vocabulary]); // intentionally not re-building mid-session on every progress change

  const item = session[index];
  const entry = item?.entry;

  const safe = useMemo(
    () => (entry ? buildSafePrompt(entry, mode) : null),
    [entry, mode],
  );
  const reveal = useMemo(
    () => (entry && result ? buildReveal(entry, mode) : null),
    [entry, mode, result],
  );
  const previewExample = useMemo(
    () => (entry ? exampleBeforeAnswer(entry, mode) : null),
    [entry, mode],
  );

  function submit(rawOverride?: string) {
    if (!entry || result) return;
    const raw = rawOverride ?? answer;
    if (rawOverride !== undefined) setAnswer(rawOverride);
    const evaluated = evaluateAnswer(entry, mode, raw);
    // Accuracy follows the answer, not the later SRS button
    recordAnswer(entry.id, evaluated.verdict === 'correct');
    setResult(evaluated);
    setActionIndex(evaluated.verdict === 'correct' ? 1 : 0);
  }

  function advance() {
    const next = index + 1;
    if (next >= session.length) {
      setFinished(true);
      return;
    }
    setIndex(next);
    setAnswer('');
    setResult(null);
    setActionIndex(0);
  }

  function gradeAndNext(grade: Grade) {
    if (!entry) return;
    applyGrade(entry.id, grade);
    advance();
  }

  function onAlreadyKnow() {
    if (!entry) return;
    applyGrade(entry.id, 'know');
    advance();
  }

  function finishSession() {
    setFinished(true);
  }

  function insertChar(ch: string) {
    setAnswer((a) => a + ch);
  }

  const gradeActions: GradeAction[] = useMemo(() => {
    if (!result || !entry) return [];
    if (result.verdict === 'incorrect') {
      return [
        {
          id: 'again',
          label: ui === 'ru' ? 'Повторить позже' : 'Again',
          className: 'btn btn-danger',
          run: () => gradeAndNext('again'),
        },
        {
          id: 'hard',
          label: ui === 'ru' ? 'Трудно' : 'Hard',
          className: 'btn btn-secondary',
          run: () => gradeAndNext('hard'),
        },
      ];
    }
    return [
      {
        id: 'hard',
        label: ui === 'ru' ? 'Трудно' : 'Hard',
        className: 'btn btn-secondary',
        run: () => gradeAndNext('hard'),
      },
      {
        id: 'good',
        label: ui === 'ru' ? 'Хорошо · далее' : 'Good · next',
        className: 'btn btn-primary',
        run: () => gradeAndNext('good'),
      },
      {
        id: 'easy',
        label: ui === 'ru' ? 'Легко' : 'Easy',
        className: 'btn btn-ghost',
        run: () => gradeAndNext('easy'),
      },
      {
        id: 'know',
        label: ui === 'ru' ? 'Уже знаю' : 'Already know',
        className: 'btn btn-ghost',
        run: () => onAlreadyKnow(),
      },
    ];
    // gradeAndNext/onAlreadyKnow close over entry; rebuild when result/entry/ui change
  }, [result, entry, ui]);

  useEffect(() => {
    if (!result || gradeActions.length === 0) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActionIndex((i) => (i + 1) % gradeActions.length);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActionIndex(
          (i) => (i - 1 + gradeActions.length) % gradeActions.length,
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        gradeActions[actionIndex]?.run();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [result, gradeActions, actionIndex]);

  if (finished || !entry || !safe) {
    return (
      <div className="learn-screen">
        <section className="panel empty-state">
          <h2>{ui === 'ru' ? 'Сессия завершена' : 'Session complete'}</h2>
          <p className="muted">
            {session.length === 0
              ? ui === 'ru'
                ? 'Сейчас нет карточек по выбранным фильтрам. Расширьте темы или уровни в настройках.'
                : 'No cards match your filters right now. Broaden topics or levels in Settings.'
              : ui === 'ru'
                ? 'Отличная работа. Продолжайте завтра — интервалы уже обновлены.'
                : 'Nice work. Come back tomorrow — your intervals are already updated.'}
          </p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/">
              {ui === 'ru' ? 'На главную' : 'Home'}
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const items = buildSession(vocabulary, useAppStore.getState().progress);
                setSession(items);
                setIndex(0);
                setAnswer('');
                setResult(null);
                setFinished(items.length === 0);
              }}
            >
              {ui === 'ru' ? 'Ещё сессия' : 'Another session'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const pct = Math.round((index / session.length) * 100);
  const intoDe = producesGerman(mode);

  return (
    <div className="learn-screen">
      <div className="meta-row">
        <span>
          {index + 1} / {session.length}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span className="chip reason-chip">{item.reason}</span>
          <button type="button" className="btn btn-ghost" onClick={finishSession}>
            {ui === 'ru' ? 'Завершить' : 'End session'}
          </button>
        </div>
      </div>
      <div className="progress-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>

      <section className="prompt-card">
        <div className="meta-row">
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="chip">{safe.posLabel}</span>
            <span className="chip">{safe.level}</span>
          </div>
          {!result && item.kind === 'new' && (
            <button type="button" className="btn btn-ghost" onClick={onAlreadyKnow}>
              {ui === 'ru' ? 'Уже знаю' : 'Already know'}
            </button>
          )}
        </div>

        <div className="prompt-text">{safe.prompt}</div>

        {previewExample && !result && (
          <div className="example-block">
            <div className="example-label">
              {ui === 'ru' ? 'Пример' : 'Example'}
            </div>
            <div className="example-de">{previewExample.text}</div>
          </div>
        )}

        {safe.safeHints.length > 0 && (
          <ul className="hint-list">
            {safe.safeHints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}

        {!result ? (
          <div className="answer-form">
            <div className="muted" id="answer-label">
              {intoDe
                ? ui === 'ru'
                  ? 'Ответ на немецком'
                  : 'Answer in German'
                : mode === 'de-ru'
                  ? 'Ответ на русском'
                  : 'Answer in English'}
            </div>
            <AnswerField
              resetKey={`${entry.id}-${index}`}
              value={answer}
              onChange={setAnswer}
              onSubmit={submit}
              labelledBy="answer-label"
              placeholder={
                intoDe && entry.pos === 'noun'
                  ? 'der / die / das …'
                  : undefined
              }
            />
            {progress.settings.showUmlautButtons && intoDe && (
              <div className="umlaut-row" aria-label="Umlaut helpers">
                {UMLAUTS.map((ch) => (
                  <button key={ch} type="button" onClick={() => insertChar(ch)}>
                    {ch}
                  </button>
                ))}
              </div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => submit()}
              >
                {ui === 'ru' ? 'Проверить' : 'Check'}
              </button>
            </div>
          </div>
        ) : (
          <div className={`feedback ${result.verdict}`}>
            <div className="feedback-title">
              {result.message[ui]}
            </div>
            {result.verdict !== 'correct' && result.normalizedGiven && (
              <div className="your-answer">
                <span className="example-label">
                  {ui === 'ru' ? 'Ваш ответ' : 'Your answer'}
                </span>
                <span className="your-answer-text">{answer || result.normalizedGiven}</span>
              </div>
            )}
            {reveal && (
              <>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Illustration id={reveal.illustration} />
                  <div>
                    <div className="example-label">
                      {ui === 'ru' ? 'Правильный ответ' : 'Correct answer'}
                    </div>
                    <div className="reveal-lemma">{reveal.lemma}</div>
                  </div>
                </div>

                {reveal.conjugations && (
                  <div className="conjugation-grid">
                    {Object.entries(reveal.conjugations).map(([k, v]) => (
                      <div key={k}>
                        <span className="muted">{k}</span> {v}
                      </div>
                    ))}
                  </div>
                )}

                {reveal.grammar.length > 0 && (
                  <div className="grammar-lines">
                    {reveal.grammar.map((g) => (
                      <div key={g}>{g}</div>
                    ))}
                  </div>
                )}

                <div className="example-block">
                  <div className="example-label">
                    {ui === 'ru' ? 'Пример' : 'Example'}
                  </div>
                  <div className="example-de">{reveal.example.de}</div>
                  <div className="example-tr">
                    {ui === 'ru' ? reveal.example.ru : reveal.example.en}
                  </div>
                </div>
              </>
            )}

            <div
              className="btn-row grade-actions"
              role="toolbar"
              aria-label={ui === 'ru' ? 'Оценка ответа' : 'Grade answer'}
            >
              {gradeActions.map((action, i) => (
                <button
                  key={action.id}
                  type="button"
                  className={`${action.className}${i === actionIndex ? ' is-keyboard-focus' : ''}`}
                  onClick={action.run}
                  onMouseEnter={() => setActionIndex(i)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <p className="muted grade-hint">
              {ui === 'ru'
                ? '← → выбор · Enter — подтвердить'
                : '← → to choose · Enter to confirm'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
