import type { ReactNode } from 'react';

const icons: Record<string, ReactNode> = {
  table: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="8" y="22" width="48" height="6" rx="2" fill="#0c6b5c" />
      <path d="M16 28v22M48 28v22M28 28v22M36 28v22" stroke="#0c6b5c" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  house: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M8 30 L32 10 L56 30" stroke="#0c6b5c" strokeWidth="3" strokeLinejoin="round" />
      <path d="M14 28v26h36V28" stroke="#0c6b5c" strokeWidth="3" />
      <rect x="26" y="36" width="12" height="18" fill="#c45c26" />
    </svg>
  ),
  car: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M10 36h44l-4-12H14l-4 12z" fill="#0c6b5c" />
      <rect x="8" y="36" width="48" height="10" rx="3" fill="#094f44" />
      <circle cx="18" cy="48" r="5" fill="#14221f" />
      <circle cx="46" cy="48" r="5" fill="#14221f" />
    </svg>
  ),
  food: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="32" cy="40" rx="20" ry="8" fill="#0c6b5c" />
      <path d="M16 40c0-12 8-22 16-22s16 10 16 22" stroke="#094f44" strokeWidth="3" />
      <circle cx="32" cy="28" r="4" fill="#c45c26" />
    </svg>
  ),
  walk: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="34" cy="12" r="5" fill="#0c6b5c" />
      <path d="M34 18l-6 12 8 6-2 16M28 30l-10 6M36 36l12 4" stroke="#0c6b5c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M12 14h18c6 0 10 4 10 10v28c-4-3-8-4-10-4H12V14z" fill="#0c6b5c" />
      <path d="M52 14H34c-6 0-10 4-10 10v28c4-3 8-4 10-4h18V14z" fill="#094f44" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="20" y="8" width="24" height="48" rx="4" fill="#0c6b5c" />
      <rect x="24" y="14" width="16" height="28" fill="#d8efe9" />
      <circle cx="32" cy="50" r="2.5" fill="#d8efe9" />
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="29" y="36" width="6" height="18" fill="#7a4a2a" />
      <circle cx="32" cy="28" r="16" fill="#0c6b5c" />
      <circle cx="22" cy="32" r="10" fill="#2f9e8a" />
      <circle cx="42" cy="32" r="10" fill="#2f9e8a" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M32 52s-20-12-20-26a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 14-16 26-16 26z" fill="#c45c26" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="14" y="22" width="36" height="30" rx="4" fill="#0c6b5c" />
      <path d="M24 22v-4a8 8 0 0 1 16 0v4" stroke="#094f44" strokeWidth="3" />
    </svg>
  ),
  train: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="14" y="12" width="36" height="34" rx="8" fill="#0c6b5c" />
      <rect x="20" y="18" width="10" height="10" fill="#d8efe9" />
      <rect x="34" y="18" width="10" height="10" fill="#d8efe9" />
      <circle cx="22" cy="48" r="4" fill="#14221f" />
      <circle cx="42" cy="48" r="4" fill="#14221f" />
    </svg>
  ),
  water: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M32 8c0 0-16 22-16 32a16 16 0 0 0 32 0C48 30 32 8 32 8z" fill="#2f9e8a" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="12" fill="#c45c26" />
      <path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M14 50l6-6M44 20l6-6" stroke="#c45c26" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  bed: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M8 36h48v12H8z" fill="#0c6b5c" />
      <path d="M8 36v-8a8 8 0 0 1 8-8h16v16" fill="#2f9e8a" />
      <path d="M10 48v6M54 48v6" stroke="#094f44" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  work: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="10" y="22" width="44" height="30" rx="3" fill="#0c6b5c" />
      <path d="M24 22v-4a8 8 0 0 1 16 0v4" stroke="#094f44" strokeWidth="3" />
      <path d="M10 34h44" stroke="#d8efe9" strokeWidth="3" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="18" r="8" fill="#0c6b5c" />
      <path d="M16 52c2-12 10-18 16-18s14 6 16 18" fill="#0c6b5c" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="22" stroke="#0c6b5c" strokeWidth="3" />
      <path d="M32 18v16l10 6" stroke="#c45c26" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="18" fill="#0c6b5c" />
      <path d="M22 34c2 6 18 6 20 0" stroke="#d8efe9" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="26" r="2.5" fill="#d8efe9" />
      <circle cx="40" cy="26" r="2.5" fill="#d8efe9" />
    </svg>
  ),
};

export function Illustration({ id }: { id?: string }) {
  if (!id) return null;
  const icon = icons[id] ?? icons.default;
  return (
    <div className="illustration" aria-hidden>
      {icon}
    </div>
  );
}
