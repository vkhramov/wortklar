import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(
  readFileSync(join(root, 'src/data/illustration-catalog.json'), 'utf8'),
);

/** @type {string[]} */
export const ILLUSTRATION_IDS = Object.keys(catalog);

/** Concrete / pictorial parts of speech only. */
const ALLOWED_POS = new Set(['noun', 'verb']);

/**
 * Build lookup: keyword → { id, weight } with longer keywords preferred.
 * @returns {Map<string, { id: string, weight: number }>}
 */
function buildKeywordIndex() {
  /** @type {Map<string, { id: string, weight: number }>} */
  const map = new Map();
  for (const [id, meta] of Object.entries(catalog)) {
    for (const raw of meta.keywords ?? []) {
      const key = normalizeToken(raw);
      if (!key) continue;
      const weight = key.length;
      const prev = map.get(key);
      // Prefer longer / more specific keywords; on ties keep first (more specific entries listed first in catalog intent)
      if (!prev || weight > prev.weight) {
        map.set(key, { id, weight });
      }
    }
  }
  return map;
}

const KEYWORD_INDEX = buildKeywordIndex();

export function normalizeToken(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim();
}

function tokensFromEntry(entry) {
  const out = new Set();
  const add = (s) => {
    const n = normalizeToken(s);
    if (!n) return;
    out.add(n);
    for (const part of n.split(/\s+/)) {
      if (part.length >= 3) out.add(part);
    }
  };
  add(entry.lemma?.replace(/^sich\s+/i, '') ?? '');
  for (const g of entry.en ?? []) add(g);
  return out;
}

/**
 * Pick an illustration id for a vocab entry, or null if abstract / no match.
 */
export function assignIllustration(entry) {
  if (!ALLOWED_POS.has(entry.pos)) return null;

  const tokens = tokensFromEntry(entry);
  let best = null;

  for (const token of tokens) {
    const hit = KEYWORD_INDEX.get(token);
    if (!hit) continue;
    if (!best || hit.weight > best.weight) {
      best = hit;
    }
  }

  if (entry.pos === 'verb' && best && best.weight < 4) {
    return null;
  }

  return best?.id ?? null;
}

export function illustrationIdSet() {
  return new Set(ILLUSTRATION_IDS);
}
