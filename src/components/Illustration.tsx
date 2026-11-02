import catalog from '../data/illustration-catalog.json';

type CatalogEntry = { emoji: string; keywords: string[] };

const CATALOG = catalog as Record<string, CatalogEntry>;

export function Illustration({ id }: { id?: string }) {
  if (!id) return null;
  const entry = CATALOG[id];
  if (!entry?.emoji) return null;
  return (
    <div className="illustration" aria-hidden>
      <span className="illustration-emoji">{entry.emoji}</span>
    </div>
  );
}

export const ILLUSTRATION_ICON_IDS = Object.keys(CATALOG);
