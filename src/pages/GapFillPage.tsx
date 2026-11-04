import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AnswerField } from '../components/AnswerField';
import { DictateButton } from '../components/DictateButton';
import { PronounceButton } from '../components/PronounceButton';
import {
  SessionSummary,
  type SessionMiss,
} from '../components/SessionSummary';
import { evaluateGapAnswer, gapCatalogStats, type GapFillItem } from '../lib/gapFill';
import { buildGapSession, type GapSessionItem } from '../lib/gapSession';
import { bindKeyboardInset } from '../lib/keyboardInset';
import { interfaceLang, uiLangFromMode } from '../lib/leakage';
import { scrollGradeActionsIntoView } from '../lib/scrollGradeActions';
import type { Grade } from '../lib/srs';
import type { AnswerResult } from '../types/vocab';

function gapMissLabel(gap: GapFillItem): SessionMiss {
  const filled = gap.promptDe.replace('_______', gap.fullForm);
  return {
    id: gap.cardId,
    primary: `${gap.infinitive} → ${gap.fullForm}`,
    secondary: filled,
  };
}

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

type GradeAction = {
  id: string;
  label: string;
  className: string;
  run: () => void;
};

export function GapFillPage() {
  const { vocabulary, vocabLoaded, progress, applyGrade, recordAnswer } = useAppStore();
  const ui = interfaceLang(progress.settings);
  const study = uiLangFromMode(progress.settings.mode);
  const catalogInfo = gapCatalogStats();

  const [session, setSession] = useState<GapSessionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [actionIndex, setActionIndex] = useState(0);
  const [gradeReady, setGradeReady] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [misses, setMisses] = useState<SessionMiss[]>([]);

  function resetSession(items: GapSessionItem[]) {
    setSession(items);
    setIndex(0);
    setAnswer('');
    setResult(null);
    setFinished(items.length === 0);
    setActionIndex(0);
    setGradeReady(false);
    setCorrectCount(0);
    setAnsweredCount(0);
    setMisses([]);
  }

  // Value keys — not `settings.levels` by reference. GitHub sync replaces
  // progress with a new object and was restarting the session mid-run.
  const levelsKey = progress.settings.levels.join('\0');
  const sessionSize = progress.settings.sessionSize;
  const newPerSession = progress.settings.newPerSession;

  useEffect(() => {
    resetSession(buildGapSession(vocabulary, useAppStore.getState().progress));
    // Card updates / sync must not rebuild the queue mid-session (same as Learn).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [vocabulary, levelsKey, sessionSize, newPerSession]);

  const item = session[index];
  const gap = item?.gap;
  const answering = Boolean(gap && !result && !finished);

  useEffect(() => {
    document.body.classList.toggle('learn-compose', answering);
    if (!answering) return () => document.body.classList.remove('learn-compose');
    const unbind = bindKeyboardInset();
    return () => {
      document.body.classList.remove('learn-compose');
      unbind();
    };
  }, [answering]);

  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(scrollGradeActionsIntoView, 80);
    return () => window.clearTimeout(t);
  }, [result, index]);

  function submit(rawOverride?: string) {
    if (!gap || result) return;
    const raw = rawOverride ?? answer;
    if (rawOverride !== undefined) setAnswer(rawOverride);
    const evaluated = evaluateGapAnswer(gap, raw);
    const ok = evaluated.verdict === 'correct';
    recordAnswer(gap.cardId, ok);
    setAnsweredCount((n) => n + 1);
    if (ok) setCorrectCount((n) => n + 1);
    else {
      setMisses((prev) =>
        prev.some((m) => m.id === gap.cardId)
          ? prev
          : [...prev, gapMissLabel(gap)],
      );
    }
    setGradeReady(false);
    setResult(evaluated);
    setActionIndex(ok ? 1 : 0);
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

  if (!vocabLoaded) {
    return (
      <div className="panel">
        {ui === 'ru' ? 'Загружаю словарь…' : 'Loading the word list…'}
      </div>
    );
  }

  if (finished || !gap || !item) {
    return (
      <SessionSummary
        ui={ui}
        title={
          ui === 'ru' ? 'Сессия gap-fill завершена' : 'Gap-fill session complete'
        }
        answered={answeredCount}
        correct={correctCount}
        misses={misses}
        emptyMessage={
          ui === 'ru'
            ? 'Сейчас нет форм к повторению. Расширьте уровни в настройках или загляните позже.'
            : 'Nothing due right now. Broaden levels in Settings or check back later.'
        }
        footnote={
          ui === 'ru'
            ? `Каталог: ${catalogInfo.verbs} глаголов · ${catalogInfo.forms} форм (A1–B1)`
            : `Catalog: ${catalogInfo.verbs} verbs · ${catalogInfo.forms} forms (A1–B1)`
        }
        onAgain={() => {
          resetSession(
            buildGapSession(vocabulary, useAppStore.getState().progress),
          );
        }}
      />
    );
  }

  const pct = Math.round((index / session.length) * 100);
  const filledPrompt = gap.promptDe.replace('_______', gap.fullForm);
  const personLabel =
    gap.person === 'er'
      ? 'er/sie/es'
      : gap.person === 'sie'
        ? 'sie/Sie'
        : gap.person;

  return (
    <div
      className={`learn-screen${answering ? ' is-answering' : ''}${result ? ' is-grading' : ''}`}
    >
      <div className="meta-row learn-session-meta">
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
        <div className="meta-row learn-card-meta">
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="chip">
              {ui === 'ru' ? 'Пропуск' : 'Gap-fill'}
            </span>
            <span className="chip">{gap.level}</span>
            <span className="chip">{personLabel}</span>
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
          {gap.ru && (
            <>
              {' · '}
              <span className="muted">{gap.ru}</span>
            </>
          )}
          {gap.rektion && (
            <span className="chip" style={{ marginLeft: '0.5rem' }}>
              {gap.rektion}
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
              />
              <DictateButton
                lang="de-DE"
                onTranscript={setAnswer}
                resetKey={`${gap.cardId}-${index}`}
                ui={ui}
              />
            </div>
            <div className="compose-tools">
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
              <div className="example-de-row">
                <div className="example-de">{filledPrompt}</div>
                <PronounceButton
                  text={filledPrompt}
                  label={ui === 'ru' ? 'Слушать' : 'Listen'}
                />
              </div>
              {(study === 'ru'
                ? gap.exampleRu || gap.exampleEn
                : gap.exampleEn || gap.exampleRu) && (
                <div className="example-tr">
                  {study === 'ru'
                    ? gap.exampleRu || gap.exampleEn
                    : gap.exampleEn || gap.exampleRu}
                </div>
              )}
            </div>

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
