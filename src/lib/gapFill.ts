import type { AnswerResult, VocabEntry } from '../types/vocab';
import { expandGermanVariants, normalizeAnswer } from './answer';

export type GapPerson = 'ich' | 'du' | 'er' | 'wir' | 'ihr' | 'sie';

export type GapFillItem = {
  /** Progress key, e.g. gap:verb-wohnen */
  cardId: string;
  entry: VocabEntry;
  person: GapPerson;
  /** Sentence with _______ for the finite verb. */
  promptDe: string;
  infinitive: string;
  /** Accepted answers (finite form ± separable/reflexive particle). */
  expectedForms: string[];
  /** Full conjugated table form, e.g. "fange an". */
  fullForm: string;
  exampleEn: string;
  exampleRu: string;
  source: 'example' | 'template';
};

const PERSONS: GapPerson[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

const TEMPLATES: Record<GapPerson, string> = {
  ich: 'Ich _______ ({lemma}) hier.',
  du: 'Du _______ ({lemma}) hier.',
  er: 'Er _______ ({lemma}) hier.',
  wir: 'Wir _______ ({lemma}) hier.',
  ihr: 'Ihr _______ ({lemma}) hier.',
  sie: 'Sie _______ ({lemma}) hier.',
};

export function gapCardId(entryId: string): string {
  return `gap:${entryId}`;
}

export function isGapCardId(id: string): boolean {
  return id.startsWith('gap:');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive index of `needle` as a whole token in `hay`. */
function findTokenIndex(hay: string, needle: string): number {
  if (!needle) return -1;
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`,
    'iu',
  );
  const m = re.exec(hay);
  return m ? m.index : -1;
}

function finiteAndRest(fullForm: string): { finite: string; rest: string } {
  const parts = fullForm.trim().split(/\s+/);
  return { finite: parts[0] ?? fullForm, rest: parts.slice(1).join(' ') };
}

function blankAt(sentence: string, start: number, len: number): string {
  return `${sentence.slice(0, start)}_______${sentence.slice(start + len)}`;
}

/**
 * Build one A1 gap-fill item for a verb: prefer cloze from example.de,
 * else a short person template.
 */
export function buildGapItem(entry: VocabEntry): GapFillItem | null {
  if (entry.pos !== 'verb' || !entry.conjugations) return null;

  const infinitive = entry.lemma.replace(/^sich\s+/i, '');
  const cardId = gapCardId(entry.id);

  // Try each person; prefer matches in the example sentence
  type Hit = {
    person: GapPerson;
    fullForm: string;
    finite: string;
    index: number;
  };
  const hits: Hit[] = [];

  for (const person of PERSONS) {
    const fullForm = entry.conjugations[person];
    if (!fullForm) continue;
    const { finite } = finiteAndRest(fullForm);
    const index = findTokenIndex(entry.example.de, finite);
    if (index >= 0) {
      hits.push({ person, fullForm, finite, index });
    }
  }

  if (hits.length > 0) {
    // Prefer longer finite forms (ißt over is) then earlier in sentence
    hits.sort(
      (a, b) =>
        b.finite.length - a.finite.length || a.index - b.index,
    );
    const hit = hits[0];
    const expectedForms = uniqueForms([hit.finite, hit.fullForm]);
    return {
      cardId,
      entry,
      person: hit.person,
      promptDe: blankAt(entry.example.de, hit.index, hit.finite.length),
      infinitive,
      expectedForms,
      fullForm: hit.fullForm,
      exampleEn: entry.example.en,
      exampleRu: entry.example.ru,
      source: 'example',
    };
  }

  // Template fallback — ich first (most common production target)
  const person: GapPerson = 'ich';
  const fullForm = entry.conjugations[person];
  if (!fullForm) return null;
  const { finite } = finiteAndRest(fullForm);
  return {
    cardId,
    entry,
    person,
    promptDe: TEMPLATES[person].replace('{lemma}', infinitive),
    infinitive,
    expectedForms: uniqueForms([finite, fullForm]),
    fullForm,
    exampleEn: entry.example.en,
    exampleRu: entry.example.ru,
    source: 'template',
  };
}

function uniqueForms(forms: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of forms) {
    const n = normalizeAnswer(f, 'de');
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(f.trim());
  }
  return out;
}

/** A1 verbs only, highest frequency first. */
export function listA1GapItems(vocabulary: VocabEntry[]): GapFillItem[] {
  return vocabulary
    .filter((e) => e.pos === 'verb' && e.level === 'A1')
    .sort(
      (a, b) =>
        b.frequency - a.frequency ||
        a.lemma.localeCompare(b.lemma, 'de'),
    )
    .map(buildGapItem)
    .filter((x): x is GapFillItem => x !== null);
}

export function evaluateGapAnswer(
  item: GapFillItem,
  raw: string,
): AnswerResult {
  const given = normalizeAnswer(raw, 'de');
  const givenVariants = new Set(expandGermanVariants(given));

  for (const expected of item.expectedForms) {
    const expNorm = normalizeAnswer(expected, 'de');
    const expVariants = expandGermanVariants(expNorm);
    if (expVariants.some((v) => givenVariants.has(v))) {
      return {
        verdict: 'correct',
        message: {
          en: 'Correct!',
          ru: 'Верно!',
        },
        expected: item.fullForm,
        normalizedExpected: expNorm,
        normalizedGiven: given,
      };
    }
  }

  return {
    verdict: 'incorrect',
    message: {
      en: 'Not quite — check the conjugated form.',
      ru: 'Не совсем — проверьте форму глагола.',
    },
    expected: item.fullForm,
    normalizedExpected: normalizeAnswer(item.fullForm, 'de'),
    normalizedGiven: given,
  };
}
