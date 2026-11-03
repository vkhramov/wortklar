/** Keep utterances alive until spoken — Chrome GC can drop them mid-flight. */
const pendingUtterances = new Set<SpeechSynthesisUtterance>();

function pickGermanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const de = voices.filter((v) => v.lang.toLowerCase().startsWith('de'));
  if (!de.length) return undefined;

  // Prefer local/system voices: Chrome's remote "Google …" voices are flaky on macOS.
  const local =
    de.find((v) => v.localService && /de-DE/i.test(v.lang)) ??
    de.find((v) => v.localService);
  if (local) return local;

  return (
    de.find((v) => /de-DE/i.test(v.lang) && !/google/i.test(v.name)) ??
    de.find((v) => /de-DE/i.test(v.lang)) ??
    de[0]
  );
}

function unlockSynth(): void {
  const s = window.speechSynthesis;
  // Chrome macOS often sticks in paused=true and then silently ignores speak().
  try {
    s.resume();
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
  utter.addEventListener('end', release);
  utter.addEventListener('error', release);
  pendingUtterances.add(utter);

  // cancel() then immediate speak() can no-op on Chrome desktop — brief defer helps.
  window.setTimeout(() => {
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    window.speechSynthesis.speak(utter);
  }, 40);
}

/** Speak text with the browser’s German voice (Web Speech API). */
export function speakGerman(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Voices load async on first use (especially Chrome).
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      enqueue(trimmed);
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    // Kick the voice list load.
    window.speechSynthesis.getVoices();
    // Fallback if voiceschanged never fires (some Chrome builds).
    window.setTimeout(() => {
      if (window.speechSynthesis.getVoices().length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        enqueue(trimmed);
      }
    }, 250);
    return true;
  }

  enqueue(trimmed);
  return true;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
