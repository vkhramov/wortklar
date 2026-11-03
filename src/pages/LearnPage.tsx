import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { buildSession } from '../lib/session';
import { evaluateAnswer, producesGerman } from '../lib/answer';
import { exampleBeforeAnswer } from '../lib/example';
import { buildReveal, buildSafePrompt, uiLangFromMode } from '../lib/leakage';
import { AnswerField } from '../components/AnswerField';
import { DictateButton } from '../components/DictateButton';
import { Illustration } from '../components/Illustration';
import { PronounceButton } from '../components/PronounceButton';
import {
  SessionSummary,
  type SessionMiss,
} from '../components/SessionSummary';
import { WordPhoto } from '../components/WordPhoto';
import { recognitionLangForMode } from '../lib/speechRecognition';
import { hasWordImage, preloadWordImage } from '../lib/wordImages';
import { scrollGradeActionsIntoView } from '../lib/scrollGradeActions';
import type { AnswerResult, SessionItem, VocabEntry } from '../types/vocab';
import type { Grade } from '../lib/srs';

function learnMissLabel(entry: VocabEntry): SessionMiss {
  const primary =
    entry.pos === 'noun' && entry.article
      ? `${entry.article} ${entry.lemma}`
      : entry.lemma;
  const secondary = [...entry.ru, ...entry.en].filter(Boolean).slice(0, 2).join(' · ');
  return { id: entry.id, primary, secondary: secondary || undefined };
}

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
  // Prevent the submitting Enter/click from also activating a grade button
  const [gradeReady, setGradeReady] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [misses, setMisses] = useState<SessionMiss[]>([]);

  function resetSession(items: SessionItem[]) {
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

  useEffect(() => {
    resetSession(buildSession(vocabulary, progress));
    // intentionally not re-building mid-session on every progress change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [vocabulary]);

  const item = session[index];
  const entry = item?.entry;

  // Prefetch current (+ next) photo while the learner types — before Check
  useEffect(() => {
    if (!entry) return;
    preloadWordImage(entry.id);
    const next = session[index + 1]?.entry;
    if (next) preloadWordImage(next.id);
  }, [entry, session, index]);

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
    const ok = evaluated.verdict === 'correct';
    // Accuracy follows the answer, not the later SRS button
    recordAnswer(entry.id, ok);
    setAnsweredCount((n) => n + 1);
    if (ok) setCorrectCount((n) => n + 1);
    else {
      setMisses((prev) =>
        prev.some((m) => m.id === entry.id) ? prev : [...prev, learnMissLabel(entry)],
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
    // Persist the open card if the learner already checked it but didn't grade yet
    if (entry && result) {
      applyGrade(
        entry.id,
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
    if (!result) {
      setGradeReady(false);
      return;
    }
    // Wait out the submit Enter keyup / click so they don't confirm a grade
    setGradeReady(false);
    const t = window.setTimeout(() => setGradeReady(true), 350);
    return () => window.clearTimeout(t);
  }, [result]);

  // Stop TTS only when leaving a card — not when `result` flips (that was
  // cancelling speech right as the Listen button queued it on Chrome macOS).
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [index]);

  // Phone + keyboard: free vertical space so the cue word stays on screen
  const answering = Boolean(entry && !result && !finished);
  useEffect(() => {
    document.body.classList.toggle('learn-compose', answering);
    return () => document.body.classList.remove('learn-compose');
  }, [answering]);

  useEffect(() => {
    if (!answering) return;
    const pinCue = () => {
      document
        .querySelector('.learn-screen.is-answering .prompt-text')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const t = window.setTimeout(pinCue, 120);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', pinCue);
    return () => {
      window.clearTimeout(t);
      vv?.removeEventListener('resize', pinCue);
    };
  }, [answering, index]);

  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(scrollGradeActionsIntoView, 80);
    return () => window.clearTimeout(t);
  }, [result, index]);

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

  if (finished || !entry || !safe) {
    return (
      <SessionSummary
        ui={ui}
        title={ui === 'ru' ? 'Сессия завершена' : 'Session complete'}
        answered={answeredCount}
        correct={correctCount}
        misses={misses}
        emptyMessage={
          ui === 'ru'
            ? 'Сейчас нет карточек по выбранным фильтрам. Расширьте темы или уровни в настройках.'
            : 'No cards match your filters right now. Broaden topics or levels in Settings.'
        }
        onAgain={() => {
          resetSession(
            buildSession(vocabulary, useAppStore.getState().progress),
          );
        }}
      />
    );
  }

  const pct = Math.round((index / session.length) * 100);
  const intoDe = producesGerman(mode);

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
            <span className="chip">{safe.posLabel}</span>
            <span className="chip">{safe.level}</span>
          </div>
          {!result && item.kind === 'new' && (
            <button type="button" className="btn btn-ghost" onClick={onAlreadyKnow}>
              {ui === 'ru' ? 'Уже знаю' : 'Already know'}
            </button>
          )}
        </div>

        <div className="prompt-text" id="answer-cue">
          {safe.prompt}
        </div>

        {previewExample && !result && (
          <div className="example-block example-while-answering">
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
            <div className="answer-field-row">
              <AnswerField
                resetKey={`${entry.id}-${index}`}
                value={answer}
                onChange={setAnswer}
                onSubmit={submit}
                labelledBy="answer-cue"
                placeholder={
                  intoDe && entry.pos === 'noun'
                    ? 'der / die / das …'
                    : intoDe
                      ? ui === 'ru'
                        ? 'Ответ на немецком'
                        : 'Answer in German'
                      : mode === 'de-ru'
                        ? 'Ответ на русском'
                        : 'Answer in English'
                }
              />
              <DictateButton
                lang={recognitionLangForMode(mode)}
                onTranscript={setAnswer}
                resetKey={`${entry.id}-${index}`}
                ui={ui}
              />
            </div>
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
                <div className="reveal-visuals">
                  {entry && hasWordImage(entry.id) ? (
                    <WordPhoto entryId={entry.id} alt={reveal.lemma} size="sm" />
                  ) : (
                    <Illustration id={reveal.illustration} />
                  )}
                  <div>
                    <div className="example-label">
                      {ui === 'ru' ? 'Правильный ответ' : 'Correct answer'}
                    </div>
                    <div className="reveal-lemma-row">
                      <div className="reveal-lemma">{reveal.lemma}</div>
                      <PronounceButton
                        text={reveal.lemma}
                        label={ui === 'ru' ? 'Слушать' : 'Listen'}
                      />
                    </div>
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
