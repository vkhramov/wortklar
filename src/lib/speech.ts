/**
 * Web Speech TTS helpers.
 *
 * Chrome on macOS is fragile: utterances can be GC'd, the synth can stick in
 * paused state, and speak() after setTimeout can lose the user-gesture token
 * (autoplay policy → silent failure). Keep speak() synchronous on click.
 */

/** Keep utterances alive until spoken — Chrome GC can drop them mid-flight. */
const pendingUtterances = new Set<SpeechSynthesisUtterance>();

let voicesReady = false;

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase();
}

function pickGermanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const de = voices.filter((v) => normalizeLang(v.lang).startsWith('de'));
  if (!de.length) return undefined;

  // Prefer on-device voices only. Chrome "Google Deutsch" is remote and often
  // silent or stuck on macOS.
  const local =
    de.find((v) => v.localService && normalizeLang(v.lang).startsWith('de-de')) ??
    de.find((v) => v.localService);
  if (local) return local;

  // No local German voice: do not assign a Google network voice — leave unset
  // and rely on utter.lang so the engine can pick a workable default.
  return undefined;
}

function unlockSynth(): void {
  const s = window.speechSynthesis;
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
  // Only pin a voice when it is local; otherwise lang alone is safer on Chrome Mac.
  if (voice) utter.voice = voice;

  const release = () => {
    pendingUtterances.delete(utter);
  };
  utter.addEventListener('end', release);
  utter.addEventListener('error', release);
  pendingUtterances.add(utter);

  // Must stay in the same user-gesture turn as the click (no setTimeout).
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
  window.speechSynthesis.speak(utter);

  // Chrome sometimes leaves speaking=true but produces no audio until resume.
  window.setTimeout(() => {
    try {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      /* ignore */
    }
  }, 100);
}

/** Warm the voice list early (safe to call from app boot). */
export function prefetchSpeechVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const mark = () => {
    voicesReady = window.speechSynthesis.getVoices().length > 0;
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
  voicesReady = voices.length > 0;

  if (!voicesReady) {
    // Kick load; speak immediately anyway with lang=de-DE (gesture still valid).
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      // Re-speak once voices arrive only if nothing is audible yet.
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
