import catalog from '../data/illustration-catalog.json';
import type { VocabEntry } from '../types/vocab';

type CatalogEntry = { emoji: string; keywords: string[] };

const CATALOG = catalog as Record<string, CatalogEntry>;

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const KEYWORD_INDEX = (() => {
  const map = new Map<string, string>();
  for (const [id, meta] of Object.entries(CATALOG)) {
    for (const raw of meta.keywords ?? []) {
      const key = normalizeToken(raw);
      if (!key || map.has(key)) continue;
      map.set(key, id);
    }
  }
  return map;
})();

/**
 * Word-specific only: exact lemma or full English gloss → emoji id.
 * No theme-level fallbacks (food/clothes/work).
 */
export function resolveIllustrationId(
  entry: Pick<VocabEntry, 'lemma' | 'en' | 'pos' | 'illustration'>,
): string | undefined {
  if (entry.pos !== 'noun' && entry.pos !== 'verb') return undefined;

  const candidates = [
    entry.lemma.replace(/^sich\s+/i, ''),
    ...(entry.en ?? []),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  for (const c of candidates) {
    const id = KEYWORD_INDEX.get(c);
    if (id && CATALOG[id]) return id;
  }
  return undefined;
}

export function illustrationEmoji(id?: string): string | undefined {
  if (!id) return undefined;
  return CATALOG[id]?.emoji;
}
