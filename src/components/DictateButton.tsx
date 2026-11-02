import { useEffect, useRef, useState } from 'react';
import {
  canDictate,
  startDictation,
  type DictateHandle,
  type DictateLang,
} from '../lib/speechRecognition';

type Props = {
  lang: DictateLang;
  onTranscript: (text: string) => void;
  /** Remount / stop when the card changes. */
  resetKey: string;
  ui: 'en' | 'ru';
};

export function DictateButton({ lang, onTranscript, resetKey, ui }: Props) {
  const [listening, setListening] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const handleRef = useRef<DictateHandle | null>(null);

  useEffect(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
    setErrorKey(null);
  }, [resetKey, lang]);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  if (!canDictate()) return null;

  function stop() {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  }

  function start() {
    setErrorKey(null);
    const handle = startDictation({
      lang,
      onTranscript,
      onError: (code) => {
        setErrorKey(code);
        setListening(false);
        handleRef.current = null;
      },
      onEnd: () => {
        setListening(false);
        handleRef.current = null;
      },
    });
    if (!handle) {
      setErrorKey('unsupported');
      return;
    }
    handleRef.current = handle;
    setListening(true);
  }

  const label = listening
    ? ui === 'ru'
      ? 'Стоп'
      : 'Stop'
    : ui === 'ru'
      ? 'Диктовать'
      : 'Dictate';

  const errorText =
    errorKey === 'not-allowed'
      ? ui === 'ru'
        ? 'Нет доступа к микрофону'
        : 'Microphone blocked'
      : errorKey === 'unsupported' || errorKey === 'start-failed'
        ? ui === 'ru'
          ? 'Диктовка недоступна'
          : 'Dictation unavailable'
        : errorKey
          ? ui === 'ru'
            ? 'Не расслышано — попробуйте ещё'
            : 'Didn’t catch that — try again'
          : null;

  return (
    <div className="dictate-wrap">
      <button
        type="button"
        className={`btn btn-ghost dictate-btn${listening ? ' is-listening' : ''}`}
        title={
          ui === 'ru'
            ? 'Сказать ответ в микрофон, затем поправить текст'
            : 'Speak the answer, then edit if needed'
        }
        aria-label={label}
        aria-pressed={listening}
        onClick={() => (listening ? stop() : start())}
      >
        <svg
          className="dictate-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <path d="M12 18v3" />
          <path d="M8 21h8" />
        </svg>
        <span>{label}</span>
      </button>
      {errorText && <div className="dictate-error">{errorText}</div>}
    </div>
  );
}
