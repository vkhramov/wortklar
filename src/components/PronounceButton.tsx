import { useState } from 'react';
import { canSpeak, speakGerman } from '../lib/speech';

type Props = {
  text: string;
  label?: string;
};

export function PronounceButton({ text, label = 'Listen' }: Props) {
  const [unsupported, setUnsupported] = useState(false);

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost pronounce-btn"
      title={
        unsupported
          ? 'Speech not available in this browser'
          : label
      }
      aria-label={label}
      disabled={unsupported}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canSpeak()) {
          setUnsupported(true);
          return;
        }
        // Call synchronously in the click handler (Chrome autoplay / gesture).
        const ok = speakGerman(text);
        if (!ok) setUnsupported(true);
      }}
    >
      <svg
        className="pronounce-icon"
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
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
      <span>{unsupported ? '—' : label}</span>
    </button>
  );
}
