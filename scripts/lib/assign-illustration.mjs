import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(
  readFileSync(join(root, 'src/data/illustration-catalog.json'), 'utf8'),
);

/** @type {string[]} */
export const ILLUSTRATION_IDS = Object.keys(catalog);

const ALLOWED_POS = new Set(['noun', 'verb']);

/**
 * @returns {Map<string, { id: string, weight: number }>}
 */
function buildKeywordIndex() {
  /** @type {Map<string, { id: string, weight: number }>} */
  const map = new Map();
  for (const [id, meta] of Object.entries(catalog)) {
    for (const raw of meta.keywords ?? []) {
      const key = normalizeToken(raw);
      if (!key) continue;
      // Longer / more specific keywords win ties
      const weight = key.length * 10;
      const prev = map.get(key);
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

/**
 * Prefer exact lemma / primary English gloss, then other gloss tokens.
 * @returns {{ token: string, boost: number }[]}
 */
function rankedTokens(entry) {
  /** @type {{ token: string, boost: number }[]} */
  const ranked = [];
  const seen = new Set();

  const push = (raw, boost) => {
    const n = normalizeToken(raw);
    if (!n || seen.has(n)) return;
    seen.add(n);
    ranked.push({ token: n, boost });
    for (const part of n.split(/\s+/)) {
      if (part.length < 3 || seen.has(part)) continue;
      seen.add(part);
      // Parts of a multi-word gloss are weaker than the full gloss
      ranked.push({ token: part, boost: Math.max(0, boost - 20) });
    }
  };

  push(entry.lemma?.replace(/^sich\s+/i, '') ?? '', 100);
  const en = entry.en ?? [];
  if (en[0]) push(en[0], 90);
  for (const g of en.slice(1)) push(g, 40);

  return ranked;
}

/**
 * Pick an illustration id for a vocab entry, or null if abstract / no match.
 */
export function assignIllustration(entry) {
  if (!ALLOWED_POS.has(entry.pos)) return null;

  let best = null;
  for (const { token, boost } of rankedTokens(entry)) {
    const hit = KEYWORD_INDEX.get(token);
    if (!hit) continue;
    const score = hit.weight + boost;
    if (!best || score > best.score) {
      best = { id: hit.id, score, weight: hit.weight };
    }
  }

  if (entry.pos === 'verb' && best && best.weight < 40) {
    return null;
  }

  return best?.id ?? null;
}

export function illustrationIdSet() {
  return new Set(ILLUSTRATION_IDS);
}
