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
    .trim();
}

const KEYWORD_INDEX = (() => {
  const map = new Map<string, { id: string; weight: number }>();
  for (const [id, meta] of Object.entries(CATALOG)) {
    for (const raw of meta.keywords ?? []) {
      const key = normalizeToken(raw);
      if (!key) continue;
      const weight = key.length;
      const prev = map.get(key);
      if (!prev || weight > prev.weight) map.set(key, { id, weight });
    }
  }
  return map;
})();

function tokensFromEntry(entry: Pick<VocabEntry, 'lemma' | 'en'>): Set<string> {
  const out = new Set<string>();
  const add = (s: string) => {
    const n = normalizeToken(s);
    if (!n) return;
    out.add(n);
    for (const part of n.split(/\s+/)) {
      if (part.length >= 3) out.add(part);
    }
  };
  add(entry.lemma.replace(/^sich\s+/i, ''));
  for (const g of entry.en ?? []) add(g);
  return out;
}

/** Resolve illustration id: stored field, else keyword match for nouns/verbs. */
export function resolveIllustrationId(
  entry: Pick<VocabEntry, 'lemma' | 'en' | 'pos' | 'illustration'>,
): string | undefined {
  if (entry.illustration && CATALOG[entry.illustration]) {
    return entry.illustration;
  }
  if (entry.pos !== 'noun' && entry.pos !== 'verb') return undefined;

  let best: { id: string; weight: number } | null = null;
  for (const token of tokensFromEntry(entry)) {
    const hit = KEYWORD_INDEX.get(token);
    if (!hit) continue;
    if (!best || hit.weight > best.weight) best = hit;
  }
  if (entry.pos === 'verb' && best && best.weight < 4) return undefined;
  return best?.id;
}

export function illustrationEmoji(id?: string): string | undefined {
  if (!id) return undefined;
  return CATALOG[id]?.emoji;
}
