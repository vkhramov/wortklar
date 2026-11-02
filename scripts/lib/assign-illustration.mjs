import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(
  readFileSync(join(root, 'src/data/illustration-catalog.json'), 'utf8'),
);

export const ILLUSTRATION_IDS = Object.keys(catalog);
const ALLOWED_POS = new Set(['noun', 'verb']);

export function normalizeToken(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Exact keyword → id (word-specific only; no theme buckets). */
const KEYWORD_INDEX = (() => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [id, meta] of Object.entries(catalog)) {
    for (const raw of meta.keywords ?? []) {
      const key = normalizeToken(raw);
      if (!key) continue;
      // First specific mapping wins; do not overwrite with another id
      if (!map.has(key)) map.set(key, id);
    }
  }
  return map;
})();

/**
 * Only exact lemma or full English gloss matches — never broad theme tokens.
 */
export function assignIllustration(entry) {
  if (!ALLOWED_POS.has(entry.pos)) return null;

  const candidates = [
    entry.lemma?.replace(/^sich\s+/i, '') ?? '',
    ...(entry.en ?? []),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  for (const c of candidates) {
    const id = KEYWORD_INDEX.get(c);
    if (id) return id;
  }
  return null;
}

export function illustrationIdSet() {
  return new Set(ILLUSTRATION_IDS);
}
