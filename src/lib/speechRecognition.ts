import type { LearningMode } from '../types/vocab';

export type DictateLang = 'de-DE' | 'en-US' | 'ru-RU';

/** BCP-47 tag for the language the learner must produce. */
export function recognitionLangForMode(mode: LearningMode): DictateLang {
  if (mode === 'ru-de' || mode === 'en-de') return 'de-DE';
  if (mode === 'de-ru') return 'ru-RU';
  return 'en-US';
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canDictate(): boolean {
  return getCtor() !== null;
}

export type DictateHandlers = {
  lang: DictateLang;
  /** Latest transcript for the current utterance (interim or final). */
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

export type DictateHandle = {
  stop: () => void;
};

/**
 * One-shot Chrome/Android speech recognition. Fills the answer field;
 * the learner can edit before Check.
 */
export function startDictation(handlers: DictateHandlers): DictateHandle | null {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onError('unsupported');
    return null;
  }

  const recog = new Ctor();
  recog.lang = handlers.lang;
  recog.continuous = false;
  recog.interimResults = true;
  recog.maxAlternatives = 1;

  let stopped = false;

  recog.onresult = (event) => {
    let text = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
    }
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned) handlers.onTranscript(cleaned);
  };

  recog.onerror = (event) => {
    // 'aborted' / 'no-speech' are normal when the user stops or pauses
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    handlers.onError(event.error);
  };

  recog.onend = () => {
    if (!stopped) handlers.onEnd();
  };

  try {
    recog.start();
  } catch {
    handlers.onError('start-failed');
    return null;
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recog.abort();
      } catch {
        try {
          recog.stop();
        } catch {
          /* ignore */
        }
      }
      handlers.onEnd();
    },
  };
}
