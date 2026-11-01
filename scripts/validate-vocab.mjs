#!/usr/bin/env node
/**
 * Wortklar vocabulary validator.
 * Usage: node scripts/validate-vocab.mjs [path/to/vocabulary.json]
 * Exits with code 1 when any error is found; warnings never fail the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conjugateWeak } from './lib/conjugator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = process.argv[2] ?? path.join(ROOT, 'public', 'data', 'vocabulary.json');

const POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction',
  'pronoun', 'particle', 'phrase', 'numeral', 'determiner',
]);
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);
const TOPICS = new Set(
  (
    'basics people family home housing food drink shopping transport work health time weather nature ' +
    'hobbies travel emotions education technology clothing city money cooking sports animals body ' +
    'descriptions daily-life communication appointments relationships grammar-essentials phrases'
  ).split(' '),
);
const CASES = new Set(['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel']);
const ILLUSTRATIONS = new Set([
  'table', 'house', 'car', 'food', 'walk', 'book', 'phone', 'tree', 'heart',
  'bag', 'train', 'water', 'sun', 'bed', 'work', 'person', 'clock',
]);
const PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const SEIN_VERBS = new Set([
  'gehen', 'kommen', 'fahren', 'bleiben', 'laufen', 'fliegen', 'ankommen',
  'abfahren', 'aufstehen', 'einschlafen', 'werden', 'sein', 'passieren',
  'mitkommen', 'zurückkommen', 'einsteigen', 'aussteigen', 'umsteigen',
  'aufwachen', 'abreisen', 'ausziehen', 'einziehen', 'umziehen', 'sterben',
]);

/** Irregular / suppletive adjectives whose forms differ from the lemma stem. */
const EXTRA_FORMS = {
  hoch: ['hoh', 'höher', 'höchst'],
  nah: ['näh', 'nah'],
  gut: ['gut', 'besser', 'best'],
  viel: ['viel', 'mehr'],
  gern: ['gern', 'lieber', 'liebst'],
  wenig: ['wenig', 'weniger'],
  groß: ['groß', 'größer', 'größt'],
  jung: ['jung', 'jünger'],
  alt: ['alt', 'älter'],
  lang: ['lang', 'länger'],
  kurz: ['kurz', 'kürzer'],
  warm: ['warm', 'wärmer'],
  kalt: ['kalt', 'kälter'],
  stark: ['stark', 'stärker'],
  arm: ['arm', 'ärmer'],
  klug: ['klug', 'klüger'],
  gesund: ['gesund', 'gesünder'],
  ich: ['ich', 'mich', 'mir', 'mein'],
  du: ['du', 'dich', 'dir', 'dein'],
  er: ['er', 'ihn', 'ihm', 'sein'],
  sie: ['sie', 'ihr', 'ihnen'],
  es: ['es', 'ins'],
  wir: ['wir', 'uns', 'unser'],
  ihr: ['ihr', 'euch'],
  man: ['man', 'einem', 'einen'],
  jemand: ['jemand'],
  niemand: ['niemand'],
  etwas: ['etwas'],
  nichts: ['nichts'],
  alles: ['alles', 'alle'],
  einer: ['einer', 'eine', 'einen', 'eines', 'einem'],
  ein: ['ein', 'eine', 'einen', 'einem', 'einer'],
  kein: ['kein', 'keine', 'keinen', 'keinem', 'keiner'],
  welcher: ['welch'],
  dieser: ['dies'],
  jener: ['jen'],
  jeder: ['jed'],
  manche: ['manch'],
  solche: ['solch'],
  derjenige: ['derjenige', 'diejenige', 'dasjenige'],
  selbst: ['selbst', 'selber'],
  sich: ['sich'],
  einander: ['einander'],
  ein_bisschen: ['bisschen'],
};

const GERMAN_MARKERS = new Set(
  'ich du wir ihr nicht ist sind bin hast hat habe haben wird werden kann könnt kommt kommen gehe geht gehen der die das den dem des ein eine einen einem einer und oder aber mit ohne für von zum zur im am auf wie wo wohin woher warum wann was wer wen wem'
    .split(' ')
    .filter((w) => !['was', 'die', 'wie', 'an', 'in'].includes(w)),
);

/** Stem-changing present forms [du, er]; matched by suffix so prefixed verbs are covered. */
const STRONG_PRESENT = {
  essen: ['isst', 'isst'], fressen: ['frisst', 'frisst'], messen: ['misst', 'misst'], geben: ['gibst', 'gibt'],
  nehmen: ['nimmst', 'nimmt'], sehen: ['siehst', 'sieht'], lesen: ['liest', 'liest'],
  sprechen: ['sprichst', 'spricht'], helfen: ['hilfst', 'hilft'], treffen: ['triffst', 'trifft'],
  werfen: ['wirfst', 'wirft'], brechen: ['brichst', 'bricht'], stehlen: ['stiehlst', 'stiehlt'],
  sterben: ['stirbst', 'stirbt'], treten: ['trittst', 'tritt'], empfehlen: ['empfiehlst', 'empfiehlt'],
  fahren: ['fährst', 'fährt'], schlafen: ['schläfst', 'schläft'], laufen: ['läufst', 'läuft'],
  tragen: ['trägst', 'trägt'], waschen: ['wäschst', 'wäscht'], halten: ['hältst', 'hält'],
  lassen: ['lässt', 'lässt'], fallen: ['fällst', 'fällt'], raten: ['rätst', 'rät'],
  fangen: ['fängst', 'fängt'], laden: ['lädst', 'lädt'], stoßen: ['stößt', 'stößt'],
  wachsen: ['wächst', 'wächst'], backen: ['bäckst', 'bäckt'],
};

/** Participles of strong verbs with vowel change (accepted as the target form in examples). */
const PARTICIPLES = {
  erfinden: ['erfunden'], gelingen: ['gelungen'], sterben: ['gestorben'], stehlen: ['gestohlen'],
  verschwinden: ['verschwunden'], gewinnen: ['gewonnen'], beginnen: ['begonnen'], bitten: ['gebeten'],
  trinken: ['getrunken'], schwimmen: ['geschwommen'], singen: ['gesungen'], finden: ['gefunden'],
};

const errors = [];
const warnings = [];
const err = (e, msg) => errors.push(`${e?.id ?? '?'} (${e?.lemma ?? '?'}): ${msg}`);
const warn = (e, msg) => warnings.push(`${e.id} (${e.lemma}): ${msg}`);

const lower = (s) => s.toLowerCase();
const tokens = (s) => lower(s).split(/[^\p{L}]+/u).filter(Boolean);
const hasCyr = (s) => /[\u0400-\u04FF]/.test(s);
const hasPunct = (s) => /[.!?…"»)]$/.test(s.trim());

function exampleHasTarget(e) {
  const ex = lower(e.example.de);
  const toks = tokens(e.example.de);
  const tokSet = new Set(toks);
  const lemma = lower(e.lemma);

  switch (e.pos) {
    case 'noun': {
      if (ex.includes(lemma)) return true;
      if (e.plural && e.plural !== '-' && ex.includes(lower(e.plural))) return true;
      // umlaut-free stem forms (e.g. Käse → Käse). Accept stem minus final -e + n/s
      if (lemma.endsWith('e') && ex.includes(lemma.slice(0, -1))) return true;
      return false;
    }
    case 'verb': {
      const inf = lower(e.lemma.replace(/^sich /, ''));
      const prefix = e.separable ? firstTokenPrefix(e) : null;
      const base = prefix ? inf.slice(prefix.length) : inf;
      const stem = base.replace(/(en|n)$/, '');
      const forms = new Set();
      for (const p of PERSONS) {
        const t = lower(e.conjugations[p]).split(' ')[0];
        if (t) forms.add(t);
      }
      const formHit = [...forms].some((f) => tokSet.has(f)) || ex.includes(inf);
      const stemHit =
        (stem.length >= 3 && ex.includes(stem)) ||
        [...forms].some((f) => {
          const core = f.replace(/(st|t|e|en)$/, '');
          return core.length >= 3 && toks.some((t) => t === core || (t.startsWith(core) && t.length <= core.length + 2));
        });
      const prefixHit = !prefix || ex.includes(prefix);
      const partHit = (PARTICIPLES[inf] ?? []).some((pt) => ex.includes(pt));
      return (formHit || stemHit || partHit) && prefixHit;
    }
    case 'preposition':
      return tokSet.has(lemma);
    case 'phrase': {
      return lemma
        .split(/…|\.\.\./)
        .map((part) => part.replace(/[?!.…]+$/g, '').trim())
        .filter(Boolean)
        .every((part) => ex.includes(part));
    }
    default: {
      if (lemma.includes('…') || lemma.includes('...')) {
        return lemma.split(/…|\.\.\./).map((x) => x.trim()).filter(Boolean).every((part) =>
          exampleHasTarget({ ...e, lemma: part, pos: 'particle' }),
        );
      }
      if (lemma.includes('/')) {
        return lemma.split('/').map((x) => x.trim()).filter(Boolean).some((part) =>
          exampleHasTarget({ ...e, lemma: part }),
        );
      }
      const cands = new Set([lemma]);
      if (lemma.endsWith('e')) cands.add(lemma.slice(0, -1));
      if (/(el|er|en)$/.test(lemma)) cands.add(lemma.slice(0, -2) + lemma.slice(-1));
      if (lemma.length >= 5) cands.add(lemma.slice(0, -2));
      for (const x of EXTRA_FORMS[lemma] ?? []) cands.add(x);
      if (lemma.includes(' ')) cands.add(lemma.replace(/\s+/g, ' '));
      // short function words must match as whole tokens to avoid noise
      return [...cands].some((c) =>
        c.length <= 3 ? tokSet.has(c) || toks.some((t) => t.startsWith(c) && t.length <= c.length + 3) : ex.includes(c),
      );
    }
  }
}

function firstTokenPrefix(e) {
  // separable prefix = last token of ich-form
  const parts = e.conjugations.ich.split(' ');
  return parts[parts.length - 1];
}

function checkEntry(e, idx) {
  if (typeof e !== 'object' || e === null) return err({}, `index ${idx} not an object`);
  for (const k of ['id', 'lemma', 'pos', 'level']) {
    if (typeof e[k] !== 'string' || !e[k].trim()) err(e, `missing string "${k}"`);
  }
  if (!POS.has(e.pos)) err(e, `bad pos ${e.pos}`);
  if (!LEVELS.has(e.level)) err(e, `bad level ${e.level}`);
  if (!/^[a-z0-9-]+$/.test(e.id ?? '')) err(e, `id must be ascii kebab-case`);
  if (!Array.isArray(e.topics) || !e.topics.length) err(e, 'topics must be non-empty array');
  else for (const t of e.topics) if (!TOPICS.has(t)) err(e, `unknown topic "${t}"`);
  if (!Number.isInteger(e.frequency) || e.frequency < 1 || e.frequency > 5) err(e, `bad frequency ${e.frequency}`);

  for (const lang of ['en', 'ru']) {
    if (!Array.isArray(e[lang]) || !e[lang].length) {
      err(e, `${lang} must be non-empty array`);
      continue;
    }
    for (const s of e[lang]) {
      if (typeof s !== 'string' || !s.trim()) err(e, `${lang} has empty item`);
      else if (s !== s.trim()) err(e, `${lang} item has surrounding whitespace "${s}"`);
      else if (lang === 'en' && hasCyr(s)) err(e, `en contains Cyrillic "${s}"`);
      else if (lang === 'ru' && !hasCyr(s)) err(e, `ru lacks Cyrillic "${s}"`);
    }
    if (new Set(e[lang]).size !== e[lang].length) err(e, `${lang} has duplicate items`);
  }

  const ex = e.example;
  if (!ex || typeof ex.de !== 'string' || typeof ex.en !== 'string' || typeof ex.ru !== 'string') {
    err(e, 'example needs de/en/ru strings');
  } else {
    for (const l of ['de', 'en', 'ru']) {
      if (!ex[l].trim()) err(e, `example.${l} empty`);
      else if (!hasPunct(ex[l])) err(e, `example.${l} lacks end punctuation: "${ex[l]}"`);
    }
    if (hasCyr(ex.de) || hasCyr(ex.en)) err(e, 'example de/en contains Cyrillic');
    if (!hasCyr(ex.ru)) err(e, 'example.ru lacks Cyrillic');
    if (ex.de.length > 110) warn(e, `long example (${ex.de.length} chars)`);
    if (ex.de.split(/\s+/).length < 3 && e.pos !== 'phrase') warn(e, 'very short example');
    if (lower(ex.de) === lower(ex.en)) err(e, 'example.en equals example.de');
    if (e.pos !== 'verb' || e.conjugations) {
      if (!exampleHasTarget(e)) err(e, `example.de does not contain target: "${ex.de}"`);
    }
  }

  // notes: may contain German only if the app's leakage guard can hide them,
  // i.e. the note contains a standalone token of the lemma.
  if (e.notes !== undefined) {
    if (typeof e.notes !== 'object' || e.notes === null) err(e, 'notes must be object');
    else {
      const exWords = new Set(tokens(ex?.de ?? '').filter((t) => t.length >= 4));
      const lemmaParts = lower(e.lemma).split(/[^\p{L}]+/u).filter(Boolean);
      for (const [k, v] of Object.entries(e.notes)) {
        if (!['en', 'ru'].includes(k) || typeof v !== 'string' || !v.trim()) {
          err(e, `bad notes.${k}`);
          continue;
        }
        const toks = tokens(v);
        const germanBearing =
          /[äöüß]/i.test(v) ||
          toks.some((t) => exWords.has(t) || GERMAN_MARKERS.has(t));
        const hasLemma = lemmaParts.some((part) => toks.includes(part));
        if (germanBearing && !hasLemma) {
          err(e, `notes.${k} contains German text but not the lemma (leakage guard cannot hide it): "${v.slice(0, 80)}"`);
        }
        if (k === 'ru' && !hasCyr(v)) err(e, 'notes.ru lacks Cyrillic');
      }
    }
  }

  if (e.illustration !== undefined && !ILLUSTRATIONS.has(e.illustration)) err(e, `unknown illustration ${e.illustration}`);

  // capitalization
  const first = e.lemma?.[0] ?? '';
  if (e.pos === 'noun' && first !== first.toUpperCase()) err(e, 'noun lemma must be capitalised');
  if (['verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'particle'].includes(e.pos) && first !== first.toLowerCase()) {
    err(e, 'lemma should be lowercase');
  }
  if (e.lemma !== e.lemma?.trim()) err(e, 'lemma has surrounding whitespace');

  checkPos(e);
}

function checkPos(e) {
  const isNoun = e.pos === 'noun';
  for (const k of ['article', 'plural']) {
    if (!isNoun && e[k] !== undefined) err(e, `${k} only valid for nouns`);
  }
  const verbOnly = ['conjugations', 'separable', 'reflexive', 'irregular', 'auxiliary'];
  for (const k of verbOnly) if (e.pos !== 'verb' && e[k] !== undefined) err(e, `${k} only valid for verbs`);
  const prepOnly = ['caseRequired', 'wechsel', 'caseHint'];
  for (const k of prepOnly) if (e.pos !== 'preposition' && e[k] !== undefined) err(e, `${k} only valid for prepositions`);

  if (isNoun) {
    if (!['der', 'die', 'das'].includes(e.article)) err(e, `bad article ${e.article}`);
    if (typeof e.plural !== 'string' || !e.plural.trim()) err(e, 'noun needs plural ("-" if none)');
    const l = lower(e.lemma);
    const rules = [
      [/(ung|heit|keit|schaft|tion|sion|tät)$/, 'die'],
      [/(chen|lein)$/, 'das'],
      [/(ling|ismus)$/, 'der'],
    ];
    const exceptions = new Set(['kuchen', 'drachen', 'rachen', 'wochenende']);
    for (const [re, art] of rules) {
      if (exceptions.has(l)) break;
      if (re.test(l) && e.article !== art) err(e, `suffix rule: ${e.lemma} should be ${art}, not ${e.article}`);
    }
  }

  if (e.pos === 'verb') {
    const c = e.conjugations;
    if (!c || typeof c !== 'object') return err(e, 'verb needs conjugations');
    for (const p of PERSONS) if (typeof c[p] !== 'string' || !c[p].trim()) err(e, `conjugation missing ${p}`);
    if (c.wir?.split(' ')[0] !== c.sie?.split(' ')[0] || (!e.reflexive && c.wir !== c.sie)) err(e, `wir/sie differ: ${c.wir} / ${c.sie}`);
    const inf = e.lemma.replace(/^sich /, '');
    if (!/(en|ln|rn)$/.test(inf) && !['sein', 'tun'].includes(inf)) err(e, 'infinitive should end in -en/-n');
    if (e.reflexive && !e.lemma.startsWith('sich ')) err(e, 'reflexive lemma should start with "sich "');
    if (!e.reflexive && e.lemma.startsWith('sich ')) err(e, 'missing reflexive flag');
    if (e.reflexive && !/ (mich|mir|dich|dir|sich|uns|euch)\b/.test(' ' + c.ich + ' ' + c.er)) err(e, 'reflexive pronoun missing');
    if (e.separable) {
      const prefix = firstTokenPrefix(e);
      if (!inf.startsWith(prefix)) err(e, `separable prefix "${prefix}" not in lemma`);
      for (const p of PERSONS) if (!c[p].endsWith(' ' + prefix)) err(e, `${p} form should end with prefix: ${c[p]}`);
    }
    if (!e.separable && !e.reflexive && !e.irregular && c.wir !== inf) err(e, `weak verb wir-form ${c.wir} != lemma`);
    {
      const sepP = e.separable ? firstTokenPrefix(e) : '';
      const base = (sepP ? inf.slice(sepP.length) : inf);
      const first = (x) => String(x ?? '').split(' ')[0];
      if (!['sein', 'tun'].includes(inf) && !e.irregular === false && false) { /* placeholder */ }
      if (!['sein', 'tun', 'können', 'müssen', 'wollen', 'sollen', 'dürfen', 'mögen', 'möchten', 'wissen', 'haben', 'werden'].includes(base) && first(c.wir) !== base) {
        err(e, `wir-form "${c.wir}" does not match infinitive "${base}"`);
      }
      if (!first(c.ihr).endsWith('t') && base !== 'sein') err(e, `ihr-form should end in -t: ${c.ihr}`);
      if (!/(st|ßt|t)$/.test(first(c.du)) && base !== 'sein') err(e, `du-form looks wrong: ${c.du}`);
      if (!e.irregular && !['sein'].includes(base)) {
        const exp = conjugateWeak(base);
        for (const p of PERSONS) if (first(c[p]) !== exp[p]) err(e, `weak conjugation mismatch ${p}: ${c[p]} (expected ${exp[p]})`);
      }
      for (const [key, [du, er]] of Object.entries(STRONG_PRESENT)) {
        if (base.endsWith(key) && !/(schalten|heiraten)$/.test(base)) {
          const pre = base.slice(0, -key.length);
          if (first(c.du) !== pre + du || first(c.er) !== pre + er) {
            // accept weak verbs that merely end with the same letters (e.g. "backen" in some compounds) only if flagged non-irregular
            err(e, `strong present expected ${pre + du}/${pre + er}, got ${first(c.du)}/${first(c.er)}`);
          }
          break;
        }
      }
    }
    if (!['haben', 'sein', 'haben/sein'].includes(e.auxiliary)) err(e, `bad auxiliary ${e.auxiliary}`);
    if (!e.reflexive && SEIN_VERBS.has(inf) && !String(e.auxiliary).includes('sein')) err(e, 'should take sein');
    if (e.irregular !== undefined && typeof e.irregular !== 'boolean') err(e, 'irregular must be boolean');
  }

  if (e.pos === 'preposition') {
    if (!CASES.has(e.caseRequired)) err(e, `bad caseRequired ${e.caseRequired}`);
    if ((e.caseRequired === 'Wechsel') !== (e.wechsel === true)) err(e, 'wechsel flag must match caseRequired === Wechsel');
    const h = e.caseHint;
    if (!h || typeof h.en !== 'string' || typeof h.ru !== 'string' || !h.en || !h.ru) err(e, 'caseHint needs en and ru');
    else {
      const re = new RegExp(`(^|[^\\p{L}])${e.lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');
      if (re.test(h.en) || re.test(h.ru)) err(e, 'caseHint contains the German lemma');
      if (/[äöüß]/i.test(h.en + h.ru)) err(e, 'caseHint contains German letters');
    }
  }
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`File not found: ${FILE}`);
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (error) {
    console.error(`Invalid JSON: ${error.message}`);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('Root must be an array');
    process.exit(1);
  }

  const ids = new Set();
  const keys = new Set();
  const examples = new Map();
  const byPos = {};
  const byLevel = {};
  const byTopic = {};
  const byFreq = {};
  data.forEach((e, i) => {
    checkEntry(e, i);
    if (!e || typeof e !== 'object') return;
    if (ids.has(e.id)) err(e, 'duplicate id');
    ids.add(e.id);
    const key = `${e.pos}|${e.article ?? ''}|${lower(e.lemma ?? '')}`;
    if (keys.has(key)) err(e, 'duplicate lemma/pos/article');
    keys.add(key);
    const exde = lower(e.example?.de ?? '');
    if (exde) {
      if (examples.has(exde)) err(e, `duplicate example sentence (also ${examples.get(exde)})`);
      examples.set(exde, e.id);
    }
    byPos[e.pos] = (byPos[e.pos] ?? 0) + 1;
    byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
    byFreq[e.frequency] = (byFreq[e.frequency] ?? 0) + 1;
    for (const t of e.topics ?? []) byTopic[t] = (byTopic[t] ?? 0) + 1;
  });

  const total = data.length;
  const pct = (n) => ((n / total) * 100).toFixed(1) + '%';
  if (total < 2300 || total > 2500) warnings.push(`total ${total} outside target range 2300–2500`);
  const nounShare = (byPos.noun ?? 0) / total;
  if (nounShare < 0.35 || nounShare > 0.45) warnings.push(`noun share ${pct(byPos.noun ?? 0)} (target ≈40%)`);
  const verbShare = (byPos.verb ?? 0) / total;
  if (verbShare < 0.2 || verbShare > 0.3) warnings.push(`verb share ${pct(byPos.verb ?? 0)} (target ≈25%)`);
  const advAdj = ((byPos.adjective ?? 0) + (byPos.adverb ?? 0)) / total;
  if (advAdj < 0.12 || advAdj > 0.18) warnings.push(`adj+adv share ${(advAdj * 100).toFixed(1)}% (target ≈15%)`);
  if ((byLevel.B2 ?? 0) / total > 0.12) warnings.push(`B2 share ${pct(byLevel.B2)} is high`);

  console.log(`Validated ${total} entries from ${path.relative(ROOT, FILE)}`);
  console.log('\nBy POS:');
  for (const [k, v] of Object.entries(byPos).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}  ${pct(v)}`);
  console.log('\nBy level:');
  for (const k of ['A1', 'A2', 'B1', 'B2']) console.log(`  ${k.padEnd(12)} ${String(byLevel[k] ?? 0).padStart(5)}  ${pct(byLevel[k] ?? 0)}`);
  console.log('\nBy frequency:', byFreq);
  console.log('\nBy topic:', Object.fromEntries(Object.entries(byTopic).sort((a, b) => b[1] - a[1])));

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    warnings.slice(0, 60).forEach((w) => console.log('  ⚠', w));
    if (warnings.length > 60) console.log(`  … ${warnings.length - 60} more`);
  }
  if (errors.length) {
    console.log(`\n${errors.length} ERROR(S):`);
    errors.slice(0, 200).forEach((m) => console.log('  ✗', m));
    if (errors.length > 200) console.log(`  … ${errors.length - 200} more`);
    process.exit(1);
  }
  console.log('\n✓ Validation passed with 0 errors.');
}

main();
