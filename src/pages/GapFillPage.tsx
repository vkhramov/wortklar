import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { AnswerField } from '../components/AnswerField';
import { DictateButton } from '../components/DictateButton';
import { PronounceButton } from '../components/PronounceButton';
import { evaluateGapAnswer } from '../lib/gapFill';
import { buildGapSession, type GapSessionItem } from '../lib/gapSession';
import { uiLangFromMode } from '../lib/leakage';
import type { Grade } from '../lib/srs';
import type { AnswerResult } from '../types/vocab';

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

type GradeAction = {
  id: string;
  label: string;
  className: string;
  run: () => void;
};

export function GapFillPage() {
  const { vocabulary, progress, applyGrade, recordAnswer } = useAppStore();
  const ui = uiLangFromMode(progress.settings.mode);

  const [session, setSession] = useState<GapSessionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [actionIndex, setActionIndex] = useState(0);
  const [gradeReady, setGradeReady] = useState(false);

  useEffect(() => {
    const items = buildGapSession(vocabulary, progress);
    setSession(items);
    setIndex(0);
    setAnswer('');
    setResult(null);
    setFinished(items.length === 0);
  }, [vocabulary]);

  const item = session[index];
  const gap = item?.gap;

  function submit(rawOverride?: string) {
    if (!gap || result) return;
    const raw = rawOverride ?? answer;
    if (rawOverride !== undefined) setAnswer(rawOverride);
    const evaluated = evaluateGapAnswer(gap, raw);
    recordAnswer(gap.cardId, evaluated.verdict === 'correct');
    setGradeReady(false);
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
    setGradeReady(false);
  }

  function gradeAndNext(grade: Grade) {
    if (!gap) return;
    applyGrade(gap.cardId, grade);
    advance();
  }

  function onAlreadyKnow() {
    if (!gap) return;
    applyGrade(gap.cardId, 'know');
    advance();
  }

  function finishSession() {
    if (gap && result) {
      applyGrade(
        gap.cardId,
        result.verdict === 'correct' ? 'good' : 'again',
      );
    }
    setResult(null);
    setFinished(true);
  }

  function insertChar(ch: string) {
    setAnswer((a) => a + ch);
  }

  const gradeActions: GradeAction[] = useMemo(() => {
    if (!result || !gap) return [];
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
  }, [result, gap, ui]);

  useEffect(() => {
    if (!result) {
      setGradeReady(false);
      return;
    }
    setGradeReady(false);
    const t = window.setTimeout(() => setGradeReady(true), 350);
    return () => window.clearTimeout(t);
  }, [result]);

  useEffect(() => {
    if (!result || !gradeReady || gradeActions.length === 0) return;
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
  }, [result, gradeReady, gradeActions, actionIndex]);

  if (finished || !gap || !item) {
    return (
      <div className="learn-screen">
        <section className="panel empty-state">
          <h2>
            {ui === 'ru' ? 'Сессия gap-fill завершена' : 'Gap-fill session complete'}
          </h2>
          <p className="muted">
            {session.length === 0
              ? ui === 'ru'
                ? 'Сейчас нет форм к повторению. Загляните позже или начните с новых A1-глаголов.'
                : 'Nothing due right now. Check back later or start fresh A1 verbs.'
              : ui === 'ru'
                ? 'Интервалы для глагольных форм обновлены.'
                : 'Verb-form intervals are updated.'}
          </p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/">
              {ui === 'ru' ? 'На главную' : 'Home'}
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const items = buildGapSession(
                  vocabulary,
                  useAppStore.getState().progress,
                );
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
  const filledPrompt = gap.promptDe.replace('_______', gap.fullForm);

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
            <span className="chip">
              {ui === 'ru' ? 'Пропуск' : 'Gap-fill'}
            </span>
            <span className="chip">A1</span>
            <span className="chip">{gap.person}</span>
          </div>
          {!result && item.kind === 'new' && (
            <button type="button" className="btn btn-ghost" onClick={onAlreadyKnow}>
              {ui === 'ru' ? 'Уже знаю' : 'Already know'}
            </button>
          )}
        </div>

        <div className="prompt-text gap-prompt">{gap.promptDe}</div>
        <p className="gap-infinitive">
          {ui === 'ru' ? 'Инфинитив' : 'Infinitive'}:{' '}
          <strong>{gap.infinitive}</strong>
          {gap.entry.separable && (
            <span className="chip" style={{ marginLeft: '0.5rem' }}>
              {ui === 'ru' ? 'отделяемый' : 'separable'}
            </span>
          )}
          {gap.entry.reflexive && (
            <span className="chip" style={{ marginLeft: '0.5rem' }}>
              {ui === 'ru' ? 'возвратный' : 'reflexive'}
            </span>
          )}
        </p>

        {!result ? (
          <div className="answer-form">
            <div className="muted" id="gap-answer-label">
              {ui === 'ru'
                ? 'Вставьте форму глагола'
                : 'Type the conjugated form'}
            </div>
            <div className="answer-field-row">
              <AnswerField
                resetKey={`${gap.cardId}-${index}`}
                value={answer}
                onChange={setAnswer}
                onSubmit={submit}
                labelledBy="gap-answer-label"
                placeholder={
                  gap.entry.separable
                    ? 'fängt / fängt an'
                    : undefined
                }
              />
              <DictateButton
                lang="de-DE"
                onTranscript={setAnswer}
                resetKey={`${gap.cardId}-${index}`}
                ui={ui}
              />
            </div>
            {progress.settings.showUmlautButtons && (
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
            <div className="feedback-title">{result.message[ui]}</div>
            {result.verdict !== 'correct' && result.normalizedGiven && (
              <div className="your-answer">
                <span className="example-label">
                  {ui === 'ru' ? 'Ваш ответ' : 'Your answer'}
                </span>
                <span className="your-answer-text">
                  {answer || result.normalizedGiven}
                </span>
              </div>
            )}

            <div className="example-label">
              {ui === 'ru' ? 'Правильная форма' : 'Correct form'}
            </div>
            <div className="reveal-lemma-row">
              <div className="reveal-lemma">{gap.fullForm}</div>
              <PronounceButton
                text={gap.fullForm}
                label={ui === 'ru' ? 'Слушать' : 'Listen'}
              />
            </div>

            <div className="example-block" style={{ marginTop: '0.75rem' }}>
              <div className="example-label">
                {ui === 'ru' ? 'Предложение' : 'Sentence'}
              </div>
              <div className="example-de">{filledPrompt}</div>
              <div className="example-tr">
                {ui === 'ru' ? gap.exampleRu : gap.exampleEn}
              </div>
            </div>

            {gap.entry.conjugations && (
              <div className="conjugation-grid" style={{ marginTop: '0.75rem' }}>
                {Object.entries(gap.entry.conjugations).map(([k, v]) => (
                  <div key={k} className={k === gap.person ? 'gap-person-hit' : undefined}>
                    <span className="muted">{k}</span> {v}
                  </div>
                ))}
              </div>
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
                  disabled={!gradeReady}
                  onClick={() => {
                    if (!gradeReady) return;
                    action.run();
                  }}
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
