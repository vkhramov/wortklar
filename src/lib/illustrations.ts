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
      const weight = key.length * 10;
      const prev = map.get(key);
      if (!prev || weight > prev.weight) map.set(key, { id, weight });
    }
  }
  return map;
})();

function rankedTokens(
  entry: Pick<VocabEntry, 'lemma' | 'en'>,
): { token: string; boost: number }[] {
  const ranked: { token: string; boost: number }[] = [];
  const seen = new Set<string>();

  const push = (raw: string, boost: number) => {
    const n = normalizeToken(raw);
    if (!n || seen.has(n)) return;
    seen.add(n);
    ranked.push({ token: n, boost });
    for (const part of n.split(/\s+/)) {
      if (part.length < 3 || seen.has(part)) continue;
      seen.add(part);
      ranked.push({ token: part, boost: Math.max(0, boost - 20) });
    }
  };

  push(entry.lemma.replace(/^sich\s+/i, ''), 100);
  const en = entry.en ?? [];
  if (en[0]) push(en[0], 90);
  for (const g of en.slice(1)) push(g, 40);

  return ranked;
}

/** Resolve illustration id: stored field if valid, else keyword match. */
export function resolveIllustrationId(
  entry: Pick<VocabEntry, 'lemma' | 'en' | 'pos' | 'illustration'>,
): string | undefined {
  // Always re-resolve from keywords so catalog fixes apply immediately
  if (entry.pos !== 'noun' && entry.pos !== 'verb') {
    return entry.illustration && CATALOG[entry.illustration]
      ? entry.illustration
      : undefined;
  }

  let best: { id: string; score: number; weight: number } | null = null;
  for (const { token, boost } of rankedTokens(entry)) {
    const hit = KEYWORD_INDEX.get(token);
    if (!hit) continue;
    const score = hit.weight + boost;
    if (!best || score > best.score) {
      best = { id: hit.id, score, weight: hit.weight };
    }
  }

  if (entry.pos === 'verb' && best && best.weight < 40) return undefined;
  if (best) return best.id;

  if (entry.illustration && CATALOG[entry.illustration]) {
    return entry.illustration;
  }
  return undefined;
}

export function illustrationEmoji(id?: string): string | undefined {
  if (!id) return undefined;
  return CATALOG[id]?.emoji;
}
