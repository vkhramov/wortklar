function pickGermanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'de-DE') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('de'))
  );
}

/** Speak text with the browser’s German voice (Web Speech API). */
export function speakGerman(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }

  const speak = () => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.lang = 'de-DE';
    utter.rate = 0.92;
    const voice = pickGermanVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  };

  // Chrome loads voices asynchronously on first use
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', speak, {
      once: true,
    });
  }
  speak();
  return true;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
