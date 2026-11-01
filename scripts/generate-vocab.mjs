#!/usr/bin/env node
/**
 * Wortklar vocabulary generator.
 *
 * Reads hand-written seed modules from scripts/seeds/*.mjs (each exports a
 * default template string), expands them into full VocabEntry objects
 * (articles, plurals, conjugations, case hints, ids, frequency) and writes
 * public/data/vocabulary.json.
 *
 * Seed format (one entry per line, fields separated by "|"):
 *
 *   # <pos> <level> <topic1,topic2>      <- section header (defaults for following lines)
 *   noun:        art Lemma | plural | en1/en2 | ru1/ru2 | de example | en example | ru example
 *   verb:        lemma | flags | en | ru | de | en | ru
 *   preposition: lemma | Akkusativ/Dativ/Genitiv/Wechsel | en | ru | de | en | ru
 *   others:      lemma | en | ru | de | en | ru
 *
 * Optional trailing fields on any line: f=1..5, L=A1..B2, T=topic,topic,
 * ill=<illustration>, N=<note en>^<note ru>.
 *
 * Plural shorthand: +e +n +en +er +s +nen (append), ¨ ¨e ¨er (umlaut + append),
 * = (unchanged), 0 (no plural), pl (plural-only noun), or the full plural word.
 *
 * Verb flags (space separated): w (weak) | i (irregular, regular present) |
 * s:du,er (stem-changing present) | f:ich,du,er,wir,ihr,sie (fully hardcoded);
 * sep:<prefix>; sein | haben/sein (auxiliary, default haben);
 * "sich" in the lemma → reflexive (accusative); refl-d → dative reflexive.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conjugateStemChange, conjugateWeak } from './lib/conjugator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SEED_DIR = path.join(__dirname, 'seeds');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'vocabulary.json');

const POS_LIST = [
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction',
  'pronoun', 'particle', 'phrase', 'numeral', 'determiner',
];
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const CASES = ['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel'];
const ARTICLES = ['der', 'die', 'das'];

const CASE_HINTS = {
  Akkusativ: {
    en: 'Always takes the accusative case.',
    ru: 'Всегда требует винительный падеж.',
  },
  Dativ: {
    en: 'Always takes the dative case.',
    ru: 'Всегда требует дательный падеж.',
  },
  Genitiv: {
    en: 'Takes the genitive case (in everyday speech often the dative).',
    ru: 'Требует родительный падеж (в разговорной речи часто дательный).',
  },
  Wechsel: {
    en: 'Two-way preposition: dative for location, accusative for direction.',
    ru: 'Предлог двойного управления: дательный — где? винительный — куда?',
  },
};

/**
 * lemma → illustration id. Icons are only attached where the SVG literally depicts
 * the word (or is an obvious, non-misleading cue) — abstract words get no icon.
 * Seed-provided illustration ids are intentionally ignored; this map is the single
 * source of truth.
 */
const ILLUSTRATION_GROUPS = {
  table: ['Tisch'],
  house: ['Haus', 'Wohnung', 'Mietwohnung', 'Ferienwohnung', 'Gebäude', 'Dach'],
  car: ['Auto', 'Wagen', 'Taxi', 'fahren'],
  food: ['Essen', 'Frühstück', 'Mittagessen', 'Abendessen', 'Mahlzeit', 'Teller', 'Gericht', 'Hauptgericht', 'Vorspeise', 'Nachtisch', 'Suppe', 'essen', 'kochen'],
  walk: ['Spaziergang', 'Wanderung', 'Fußgänger', 'gehen', 'wandern'],
  book: ['Buch', 'Heft', 'Wörterbuch', 'Bibliothek', 'Roman', 'lesen'],
  phone: ['Telefon', 'Handy', 'Smartphone', 'Anruf', 'telefonieren', 'anrufen'],
  tree: ['Baum', 'Wald', 'Pflanze', 'Park'],
  heart: ['Herz', 'Liebe', 'lieben'],
  bag: ['Tasche', 'Handtasche', 'Koffer', 'Rucksack', 'Tüte', 'Gepäck'],
  train: ['Zug', 'Bahn', 'Straßenbahn', 'U-Bahn', 'S-Bahn', 'Bahnhof', 'Hauptbahnhof', 'Bahnsteig', 'Gleis'],
  water: ['Wasser', 'Mineralwasser', 'Tropfen', 'Regen', 'Wasserhahn', 'trinken'],
  sun: ['Sonne', 'Sonnenschein', 'Sommer', 'Sonnenbrille'],
  bed: ['Bett', 'Schlafzimmer', 'Schlaf', 'Mittagsschlaf', 'schlafen'],
  work: ['Arbeit', 'Büro', 'Job', 'Beruf', 'Arbeitsplatz', 'Firma', 'arbeiten'],
  person: ['Mensch', 'Person', 'Mann', 'Frau', 'Junge', 'Mädchen'],
  clock: ['Uhr', 'Zeit', 'Uhrzeit', 'Wecker', 'Stunde', 'Minute', 'Sekunde'],
};
const ILLUSTRATIONS = Object.fromEntries(
  Object.entries(ILLUSTRATION_GROUPS).flatMap(([icon, lemmas]) => lemmas.map((l) => [l, icon])),
);

// ---------------------------------------------------------------- helpers

function umlaut(word) {
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word[i];
    if (c === 'u' && word[i - 1] === 'a') {
      return word.slice(0, i - 1) + 'äu' + word.slice(i + 1);
    }
    if (c === 'u' && word[i - 1] === 'e') continue;
    if (c === 'a') return word.slice(0, i) + 'ä' + word.slice(i + 1);
    if (c === 'o') return word.slice(0, i) + 'ö' + word.slice(i + 1);
    if (c === 'u') return word.slice(0, i) + 'ü' + word.slice(i + 1);
    if (c === 'A') return word.slice(0, i) + 'Ä' + word.slice(i + 1);
    if (c === 'O') return word.slice(0, i) + 'Ö' + word.slice(i + 1);
    if (c === 'U') return word.slice(0, i) + 'Ü' + word.slice(i + 1);
  }
  throw new Error(`Cannot umlaut "${word}"`);
}

function expandPlural(lemma, spec) {
  if (spec === '0') return '-';
  if (spec === '=') return lemma;
  if (spec === 'pl') return lemma;
  if (spec.startsWith('+')) return lemma + spec.slice(1);
  if (spec.startsWith('¨')) return umlaut(lemma) + spec.slice(1);
  return spec;
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function list(s, ctx) {
  const items = s.split('/').map((x) => x.trim()).filter(Boolean);
  if (!items.length) fail(ctx, `empty translation list "${s}"`);
  return items;
}

function fail(ctx, msg) {
  throw new Error(`${ctx.file}:${ctx.line}: ${msg}`);
}

function parseExtras(fields, ctx) {
  const extras = {};
  for (const f of fields) {
    const m = f.match(/^(f|L|T|ill|N)=(.*)$/s);
    if (!m) fail(ctx, `unexpected extra field "${f}"`);
    extras[m[1]] = m[2].trim();
  }
  return extras;
}

// ------------------------------------------------------------ entry builders

const REFL_ACC = { ich: 'mich', du: 'dich', er: 'sich', wir: 'uns', ihr: 'euch', sie: 'sich' };
const REFL_DAT = { ich: 'mir', du: 'dir', er: 'sich', wir: 'uns', ihr: 'euch', sie: 'sich' };
const PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

function buildNoun(f, ctx) {
  const m = f[0].match(/^(der|die|das) (.+)$/);
  if (!m) fail(ctx, `noun needs article: "${f[0]}"`);
  const [, article, lemma] = m;
  const pluralOnly = f[1] === 'pl';
  const entry = {
    lemma,
    article,
    plural: expandPlural(lemma, f[1]),
  };
  if (pluralOnly) {
    entry.notes = { en: 'Used only in the plural.', ru: 'Употребляется только во множественном числе.' };
  }
  return { entry, rest: f.slice(2) };
}

function buildVerb(f, ctx) {
  let lemma = f[0];
  const tokens = f[1].split(/\s+/).filter(Boolean);
  const reflexive = lemma.startsWith('sich ');
  const dativeRefl = tokens.includes('refl-d');
  const inf = lemma.replace(/^sich /, '');

  let sepPrefix = null;
  let aux = 'haben';
  let irregular = false;
  let forced = null;
  let stem = null;
  for (const t of tokens) {
    if (t.startsWith('sep:')) sepPrefix = t.slice(4);
    else if (t === 'sein') aux = 'sein';
    else if (t === 'haben/sein') aux = 'haben/sein';
    else if (t === 'i') irregular = true;
    else if (t === 'w' || t === 'refl-d') { /* weak default */ }
    else if (t.startsWith('s:')) { stem = t.slice(2).split(','); irregular = true; }
    else if (t.startsWith('f:')) { forced = t.slice(2).split(','); irregular = true; }
    else fail(ctx, `unknown verb flag "${t}"`);
  }

  if (sepPrefix && !inf.startsWith(sepPrefix)) fail(ctx, `${inf} does not start with ${sepPrefix}`);
  const base = sepPrefix ? inf.slice(sepPrefix.length) : inf;

  let forms;
  if (forced) {
    if (forced.length !== 6) fail(ctx, 'f: needs six forms');
    forms = Object.fromEntries(PERSONS.map((p, i) => [p, forced[i]]));
  } else if (stem) {
    if (stem.length !== 2) fail(ctx, 's: needs du,er');
    forms = conjugateStemChange(base, stem[0], stem[1]);
  } else {
    forms = conjugateWeak(base);
  }

  const refl = dativeRefl ? REFL_DAT : REFL_ACC;
  const conjugations = {};
  for (const p of PERSONS) {
    conjugations[p] = [forms[p], reflexive ? refl[p] : null, sepPrefix]
      .filter(Boolean)
      .join(' ');
  }

  const entry = { lemma, conjugations };
  if (sepPrefix) entry.separable = true;
  if (reflexive) entry.reflexive = true;
  if (irregular) entry.irregular = true;
  entry.auxiliary = aux;
  return { entry, rest: f.slice(2) };
}

function buildPreposition(f, ctx) {
  const c = f[1];
  if (!CASES.includes(c)) fail(ctx, `bad case "${c}"`);
  const entry = {
    lemma: f[0],
    caseRequired: c,
    caseHint: CASE_HINTS[c],
  };
  if (c === 'Wechsel') entry.wechsel = true;
  return { entry, rest: f.slice(2) };
}

// ------------------------------------------------------------------ parsing

function parseSeed(file, text) {
  const sections = [];
  let section = null;
  const lines = text.split('\n');
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    const ctx = { file, line: idx + 1 };
    if (line.startsWith('#')) {
      const m = line.match(/^#\s*(\w+)\s+(A1|A2|B1|B2)\s+(\S+)\s*$/);
      if (!m) fail(ctx, `bad section header "${line}"`);
      if (!POS_LIST.includes(m[1])) fail(ctx, `bad pos "${m[1]}"`);
      section = { pos: m[1], level: m[2], topics: m[3].split(','), rows: [] };
      sections.push(section);
      return;
    }
    if (!section) fail(ctx, 'entry before section header');
    section.rows.push({ ctx, fields: line.split('|').map((s) => s.trim()) });
  });
  return sections;
}

function buildSection(section) {
  const out = [];
  const total = section.rows.length;
  section.rows.forEach(({ ctx, fields }, idx) => {
    let built;
    let positional; // number of fields consumed by type-specific + translation/example fields
    const pos = section.pos;
    if (pos === 'noun') {
      built = buildNoun(fields, ctx);
    } else if (pos === 'verb') {
      built = buildVerb(fields, ctx);
    } else if (pos === 'preposition') {
      built = buildPreposition(fields, ctx);
    } else {
      built = { entry: { lemma: fields[0] }, rest: fields.slice(1) };
    }
    const { entry, rest } = built;
    positional = 5;
    if (rest.length < positional) fail(ctx, `expected ${positional} translation/example fields, got ${rest.length} (${fields[0]})`);
    const [en, ru, de, exEn, exRu] = rest;
    const extras = parseExtras(rest.slice(positional), ctx);

    const level = extras.L ?? section.level;
    if (!LEVELS.includes(level)) fail(ctx, `bad level ${level}`);
    const topics = extras.T ? extras.T.split(',') : section.topics;
    const base = { A1: 4, A2: 3, B1: 2, B2: 1 }[level];
    const bonus = idx < Math.ceil(total * 0.4) ? 1 : 0;
    const frequency = extras.f ? Number(extras.f) : Math.min(5, base + bonus);

    const full = {
      id: '',
      lemma: pos === 'phrase' ? entry.lemma.replace(/[.!]+$/, '') : entry.lemma,
      pos,
      level,
      topics,
      frequency,
      en: list(en, ctx),
      ru: list(ru, ctx),
      example: { de, en: exEn, ru: exRu },
    };
    if (entry.notes) full.notes = { ...entry.notes };
    if (extras.N) {
      const [nEn, nRu] = extras.N.split('^');
      full.notes = { en: nEn.trim(), ...(nRu ? { ru: nRu.trim() } : {}) };
    }
    const ill = extras.ill ?? ILLUSTRATIONS[entry.lemma];
    if (ill) full.illustration = ill;
    for (const k of [
      'article', 'plural', 'conjugations', 'separable', 'reflexive',
      'irregular', 'auxiliary', 'caseRequired', 'wechsel', 'caseHint',
    ]) {
      if (entry[k] !== undefined) full[k] = entry[k];
    }
    out.push(full);
  });
  return out;
}

// ---------------------------------------------------- array-row seed adapters
//
// Seed modules may also export arrays of rows:
//   NOUNS        [lemma, article, plural, en, ru, exDe, exEn, exRu, level, topics, freq, illustration?]
//   VERBS        [lemma, en, ru, exDe, exEn, exRu, level, topics, freq, flags?, conjugations?, illustration?]
//   ADJECTIVES   [lemma, en, ru, exDe, exEn, exRu, level, topics, freq, extra?]
//   ADVERBS      [lemma, en, ru, exDe, exEn, exRu, level, topics, freq, extra?]
//   PREPOSITIONS [lemma, en, ru, exDe, exEn, exRu, level, topics, freq, {caseRequired, caseHint, wechsel}]
//   OTHER        [pos, lemma, en, ru, exDe, exEn, exRu, level, topics, freq, extra?]

const SEP_PREFIXES = [
  'zusammen', 'zurück', 'voraus', 'vorbei', 'heraus', 'herein', 'hinaus', 'hinein',
  'weiter', 'empor', 'fest', 'fort', 'los', 'weg', 'her', 'hin', 'mit', 'nach',
  'vor', 'auf', 'aus', 'an', 'ab', 'ein', 'bei', 'zu', 'um', 'durch', 'über', 'teil',
  'statt', 'frei', 'zurecht', 'wieder', 'hoch', 'runter', 'rauf', 'raus', 'rein', 'rüber',
];

/**
 * Split "a, b; c (d, e)" into items; separators inside parentheses are kept.
 * seps: characters that separate alternatives (default ";," ; use ";/" for seeds that use "/").
 */
function splitList(value, seps = ';,') {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(value)) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    const isSep = depth === 0 && seps.includes(ch);
    if (isSep) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return [...new Set(out.filter(Boolean))];
}

/** Phrases are stored without trailing full stop / exclamation mark (question marks stay). */
function normalizeLemma(pos, lemma) {
  return pos === 'phrase' ? lemma.replace(/[.!]+$/, '').trim() : lemma;
}

function stripLabel(lemma) {
  const stripped = lemma.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return stripped || lemma;
}

const TOPIC_WHITELIST = new Set(
  (
    'basics people family home housing food drink shopping transport work health time weather nature ' +
    'hobbies travel emotions education technology clothing city money cooking sports animals body ' +
    'descriptions daily-life communication appointments relationships grammar-essentials phrases'
  ).split(' '),
);
const TOPIC_ALIASES = {
  numbers: 'basics', appointment: 'appointments', family: 'family', grammar: 'grammar-essentials',
  places: 'city', animal: 'animals', sport: 'sports', phrase: 'phrases', feelings: 'emotions',
  emotion: 'emotions', school: 'education', 'free-time': 'hobbies', leisure: 'hobbies',
  quantity: 'basics', directions: 'city', 'daily life': 'daily-life', dailylife: 'daily-life',
};

function splitTopics(t) {
  const raw = splitList(Array.isArray(t) ? t : String(t).replace(/\s+/g, ''));
  const out = [];
  for (const x of raw) {
    const mapped = TOPIC_WHITELIST.has(x) ? x : TOPIC_ALIASES[x];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out.length ? out : ['basics'];
}

function adaptCommon(ctx, pos, lemma, cols, seps = ';,') {
  const [en, ru, de, exEn, exRu, level, topics, frequency] = cols;
  if (!LEVELS.includes(level)) fail(ctx, `bad level "${level}" (${lemma})`);
  return {
    id: '',
    // A trailing "(label)" only disambiguates seed rows; it is not part of the word.
    lemma: normalizeLemma(pos, stripLabel(String(lemma).trim())),
    pos,
    level,
    topics: splitTopics(topics),
    frequency: Number(frequency),
    en: splitList(en, seps),
    ru: splitList(ru, seps),
    example: { de, en: exEn, ru: exRu },
  };
}

function applyExtra(full, extra) {
  if (!extra || typeof extra !== 'object') return;
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'notes') {
      if (typeof v === 'string') {
        const [nEn, nRu] = v.split('^');
        full.notes = { en: nEn.trim(), ...(nRu ? { ru: nRu.trim() } : {}) };
      } else full.notes = v;
    } else full[k] = v;
  }
}

function adaptNoun(row, ctx) {
  const [lemma, article, plural, ...cols] = row;
  const illustration = cols[8];
  const full = adaptCommon(ctx, 'noun', lemma, cols);
  full.article = article;
  full.plural = String(plural).trim() || '-';
  if (illustration) full.illustration = illustration;
  else if (ILLUSTRATIONS[full.lemma]) full.illustration = ILLUSTRATIONS[full.lemma];
  return full;
}

function adaptVerb(row, ctx) {
  const [lemma, ...cols] = row;
  const [flags, conjugations, illustration] = cols.slice(8);
  const full = adaptCommon(ctx, 'verb', lemma, cols);
  const f = flags && typeof flags === 'object' ? flags : {};
  const inf = full.lemma.replace(/^sich /, '');
  const reflexive = Boolean(f.reflexive) || full.lemma.startsWith('sich ');
  let conj = conjugations;
  if (!conj) {
    let prefix = null;
    if (f.separable) {
      prefix = SEP_PREFIXES.find((p) => inf.startsWith(p) && inf.length > p.length + 2) ?? null;
      if (!prefix) fail(ctx, `cannot derive separable prefix for ${inf}`);
    }
    const forms = conjugateWeak(prefix ? inf.slice(prefix.length) : inf);
    conj = {};
    for (const p of PERSONS) {
      conj[p] = [forms[p], reflexive ? REFL_ACC[p] : null, prefix].filter(Boolean).join(' ');
    }
  }
  full.conjugations = conj;
  if (f.separable) full.separable = true;
  if (reflexive) full.reflexive = true;
  if (f.irregular) full.irregular = true;
  full.auxiliary = f.auxiliary ?? 'haben';
  if (illustration) full.illustration = illustration;
  else if (ILLUSTRATIONS[full.lemma]) full.illustration = ILLUSTRATIONS[full.lemma];
  return full;
}

function adaptSimple(pos) {
  return (row, ctx) => {
    const [lemma, ...cols] = row;
    const full = adaptCommon(ctx, pos, lemma, cols, ';/');
    applyExtra(full, cols[8]);
    if (pos === 'preposition' && full.caseRequired !== 'Wechsel') delete full.wechsel;
    return full;
  };
}

function adaptOther(row, ctx) {
  const [pos, ...rest] = row;
  if (!POS_LIST.includes(pos)) fail(ctx, `bad pos "${pos}" in OTHER`);
  return adaptSimple(pos)(rest, ctx);
}

const NAMED_EXPORTS = {
  NOUNS: adaptNoun,
  VERBS: adaptVerb,
  ADJECTIVES: adaptSimple('adjective'),
  ADVERBS: adaptSimple('adverb'),
  PREPOSITIONS: adaptSimple('preposition'),
  OTHER: adaptOther,
};

// ------------------------------------------------------------ post-processing

const PLURAL_ONLY = new Set([
  'Eltern', 'Geschwister', 'Großeltern', 'Leute', 'Möbel', 'Unterlagen', 'Kosten',
  'Schulden', 'Nachrichten', 'Ferien', 'Pommes', 'Jeans', 'Kopfschmerzen',
  'Bauchschmerzen', 'Halsschmerzen', 'Zahnschmerzen', 'Rückenschmerzen', 'Lebensmittel',
]);

const ALLOWED_KEYS = new Set([
  'id', 'lemma', 'pos', 'level', 'topics', 'frequency', 'en', 'ru', 'example', 'notes',
  'illustration', 'article', 'plural', 'conjugations', 'separable', 'reflexive',
  'irregular', 'auxiliary', 'caseRequired', 'wechsel', 'caseHint',
]);

function normalizeEntry(e) {
  // Illustration: only from the curated map (nouns and a few action verbs).
  delete e.illustration;
  if (ILLUSTRATIONS[e.lemma] && (e.pos === 'noun' || e.pos === 'verb')) {
    e.illustration = ILLUSTRATIONS[e.lemma];
  }
  for (const k of Object.keys(e)) if (!ALLOWED_KEYS.has(k)) delete e[k];
  if (e.pos === 'noun' && PLURAL_ONLY.has(e.lemma) && e.plural === '-') {
    e.plural = e.lemma;
    e.notes = e.notes ?? {
      en: 'Used only in the plural.',
      ru: 'Употребляется только во множественном числе.',
    };
  }
  if (e.pos === 'preposition' && e.wechsel === false) delete e.wechsel;
  return e;
}

/**
 * Editorial curation: the adjective/adverb seeds are deliberately broad. To keep
 * the deck practical, A1–B1-heavy and close to the target part-of-speech mix
 * (≈40% nouns, 25% verbs, 15% adjectives/adverbs), the least useful ones are
 * dropped: B1/B2 adjectives with frequency ≤ 3 (B2: ≤ 2 is already covered) and
 * B1/B2 adverbs with frequency ≤ 2. Everything else is kept.
 */
function isCuratedOut(e) {
  const upper = e.level === 'B1' || e.level === 'B2';
  if (e.pos === 'adjective') return upper && e.frequency <= 3;
  if (e.pos === 'adverb') return upper && e.frequency <= 2;
  return false;
}

// --------------------------------------------------------------------- main

async function main() {
  const files = fs
    .readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .sort();
  if (!files.length) throw new Error('No seed modules found in scripts/seeds');

  const entries = [];
  let patches = {};
  let removals = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(SEED_DIR, file)).href);
    if (mod.PATCHES) patches = { ...patches, ...mod.PATCHES };
    if (mod.REMOVE) removals = removals.concat(mod.REMOVE);
    if (typeof mod.default === 'string') {
      for (const section of parseSeed(file, mod.default)) {
        entries.push(...buildSection(section));
      }
    }
    for (const [name, adapt] of Object.entries(NAMED_EXPORTS)) {
      if (!Array.isArray(mod[name])) continue;
      mod[name].forEach((row, i) => {
        if (!Array.isArray(row)) return;
        entries.push(adapt(row, { file: `${file}:${name}`, line: i + 1 }));
      });
    }
  }

  // Editorial patches (scripts/seeds/_patches.mjs): corrections and removals keyed "pos:lemma".
  // Applied before de-duplication so a patched example can resolve a sentence collision.
  const removeSet = new Set(removals);
  const patchKeys = new Set(Object.keys(patches));
  const foundKeys = new Set();
  const patched = [];
  let removed = 0;
  for (const e of entries) {
    const k = `${e.pos}:${e.lemma}`;
    if (removeSet.has(k)) {
      removed++;
      foundKeys.add(k);
      continue;
    }
    if (patchKeys.has(k)) {
      foundKeys.add(k);
      const { example, notes, ...rest } = patches[k];
      Object.assign(e, rest);
      if (example) e.example = { ...e.example, ...example };
      if (notes === null) delete e.notes;
      else if (notes) e.notes = { ...e.notes, ...notes };
    }
    patched.push(e);
  }
  for (const k of [...removeSet, ...patchKeys]) {
    if (!foundKeys.has(k)) console.warn(`Warning: patch/removal target not found: ${k}`);
  }
  if (removed) console.log(`Removed ${removed} entries via _patches.mjs.`);

  // De-duplicate by pos|article|lemma (first seed wins, sorted by file name).
  const keyIndex = new Map();
  const examplesSeen = new Set();
  const unique = [];
  let dupes = 0;
  const phraseHasLemma = (e) =>
    e.example.de.toLowerCase().includes(e.lemma.toLowerCase().replace(/[?!.…]+$/, '').trim());
  for (const e of patched) {
    const key = `${e.pos}|${e.article ?? ''}|${e.lemma.toLowerCase()}`;
    const ex = e.example.de.toLowerCase();
    if (keyIndex.has(key)) {
      dupes++;
      // Phrases must appear verbatim in their example: prefer the variant that does.
      const prev = keyIndex.get(key);
      if (e.pos === 'phrase' && !phraseHasLemma(prev) && phraseHasLemma(e) && !examplesSeen.has(ex)) {
        examplesSeen.delete(prev.example.de.toLowerCase());
        unique[unique.indexOf(prev)] = e;
        keyIndex.set(key, e);
        examplesSeen.add(ex);
      }
      continue;
    }
    if (examplesSeen.has(ex)) {
      dupes++;
      console.log(`Example collision: dropped ${e.pos} "${e.lemma}" (${e.example.de}) — add a PATCHES example in _patches.mjs`);
      continue;
    }
    keyIndex.set(key, e);
    examplesSeen.add(ex);
    unique.push(e);
  }
  if (dupes) console.log(`Skipped ${dupes} duplicate entries.`);

  let curated = 0;
  entries.length = 0;
  for (const e of unique) {
    if (isCuratedOut(e)) {
      curated++;
      continue;
    }
    entries.push(normalizeEntry(e));
  }
  if (curated) console.log(`Curated out ${curated} low-frequency B1/B2 adjectives/adverbs.`);

  const seen = new Map();
  for (const e of entries) {
    let id = `${e.pos}-${slug(e.lemma)}`;
    if (seen.has(id)) {
      if (e.pos === 'noun') id = `${id}-${e.article}`;
      if (seen.has(id)) id = `${id}-2`;
      if (seen.has(id)) throw new Error(`Duplicate id ${id} (${e.lemma})`);
    }
    e.id = id;
    seen.set(id, e);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const json = '[\n' + entries.map((e) => JSON.stringify(e)).join(',\n') + '\n]\n';
  fs.writeFileSync(OUT_FILE, json);

  const byPos = {};
  const byLevel = {};
  for (const e of entries) {
    byPos[e.pos] = (byPos[e.pos] ?? 0) + 1;
    byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
  }
  console.log(`Wrote ${entries.length} entries → ${path.relative(ROOT, OUT_FILE)}`);
  console.log('By POS:', byPos);
  console.log('By level:', byLevel);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
