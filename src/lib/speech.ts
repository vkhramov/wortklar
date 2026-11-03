/**
 * Web Speech TTS helpers.
 *
 * Chrome on macOS is fragile: utterances can be GC'd, the synth can stick in
 * paused state, and speak() after setTimeout can lose the user-gesture token
 * (autoplay policy → silent failure). Keep speak() synchronous on click.
 */

/** Keep utterances alive until spoken — Chrome GC can drop them mid-flight. */
const pendingUtterances = new Set<SpeechSynthesisUtterance>();

const DEBUG =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('ttsDebug');

function log(...args: unknown[]): void {
  if (DEBUG) console.info('[tts]', ...args);
}

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase();
}

function pickGermanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const de = voices.filter((v) => normalizeLang(v.lang).startsWith('de'));
  // Prefer Chrome's neural Google Deutsch when available (closest to native).
  return (
    de.find((v) => /google/i.test(v.name) && /deutsch/i.test(v.name)) ??
    de.find((v) => /google/i.test(v.name) && normalizeLang(v.lang) === 'de-de') ??
    de.find((v) => normalizeLang(v.lang) === 'de-de') ??
    de[0]
  );
}

function unlockSynth(): void {
  const s = window.speechSynthesis;
  log('unlock', {
    speaking: s.speaking,
    pending: s.pending,
    paused: s.paused,
  });
  try {
    if (s.paused) s.resume();
  } catch {
    /* ignore */
  }
  try {
    s.cancel();
  } catch {
    /* ignore */
  }
}

function enqueue(text: string): void {
  unlockSynth();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'de-DE';
  utter.rate = 0.92;
  const voice = pickGermanVoice();
  if (voice) utter.voice = voice;

  const release = () => {
    pendingUtterances.delete(utter);
  };
  utter.addEventListener('start', () => log('start', text));
  utter.addEventListener('end', () => {
    log('end', text);
    release();
  });
  utter.addEventListener('error', (ev) => {
    log('error', (ev as SpeechSynthesisErrorEvent).error, text);
    release();
  });
  pendingUtterances.add(utter);

  log('speak', {
    text,
    voice: voice ? `${voice.name} local=${voice.localService}` : '(default/lang)',
  });

  // Must stay in the same user-gesture turn as the click (no setTimeout).
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
  window.speechSynthesis.speak(utter);

  window.setTimeout(() => {
    const s = window.speechSynthesis;
    log('after100ms', {
      speaking: s.speaking,
      pending: s.pending,
      paused: s.paused,
    });
    try {
      if (s.speaking && s.paused) s.resume();
    } catch {
      /* ignore */
    }
  }, 100);
}

/** Warm the voice list early (safe to call from app boot). */
export function prefetchSpeechVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const mark = () => {
    const n = window.speechSynthesis.getVoices().length;
    if (n) log('voices ready', n);
  };
  mark();
  window.speechSynthesis.addEventListener('voiceschanged', mark);
  window.speechSynthesis.getVoices();
}

/** Speak text with the browser’s German voice (Web Speech API). */
export function speakGerman(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      if (!window.speechSynthesis.speaking) {
        enqueue(trimmed);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.speechSynthesis.getVoices();
  }

  enqueue(trimmed);
  return true;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
