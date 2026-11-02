import catalog from '../data/verb-gap-catalog.json';
import type { AnswerResult, CefrLevel } from '../types/vocab';
import { expandGermanVariants, normalizeAnswer } from './answer';

export type GapPerson = 'ich' | 'du' | 'er' | 'wir' | 'ihr' | 'sie';

export type GapForm = {
  de: string;
  promptDe: string;
  finite: string;
  fullForm: string;
  expected: string[];
  en?: string;
  ru?: string;
};

export type GapVerb = {
  id: string;
  lemma: string;
  level: CefrLevel;
  ru: string;
  rektion?: string | null;
  order: number;
  forms: Partial<Record<GapPerson, GapForm>>;
};

export type GapFillItem = {
  /** Progress key, e.g. gap:vg-sein:ich */
  cardId: string;
  verbId: string;
  lemma: string;
  level: CefrLevel;
  ru: string;
  rektion?: string | null;
  person: GapPerson;
  promptDe: string;
  infinitive: string;
  expectedForms: string[];
  fullForm: string;
  exampleDe: string;
  exampleEn?: string;
  exampleRu?: string;
};

const PERSONS: GapPerson[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const CATALOG = catalog as GapVerb[];

export function gapCardId(verbId: string, person: GapPerson): string {
  return `gap:${verbId}:${person}`;
}

export function isGapCardId(id: string): boolean {
  return id.startsWith('gap:');
}

/** Flatten catalog into SRS items: level A1→B1, catalog order, then ich→sie. */
export function listGapItems(levels?: CefrLevel[]): GapFillItem[] {
  const allow = levels?.length
    ? new Set(levels.filter((l) => l === 'A1' || l === 'A2' || l === 'B1'))
    : new Set<CefrLevel>(['A1', 'A2', 'B1']);

  const items: GapFillItem[] = [];
  for (const verb of CATALOG) {
    if (!allow.has(verb.level)) continue;
    for (const person of PERSONS) {
      const form = verb.forms[person];
      if (!form?.promptDe || !form.expected?.length) continue;
      items.push({
        cardId: gapCardId(verb.id, person),
        verbId: verb.id,
        lemma: verb.lemma,
        level: verb.level,
        ru: verb.ru,
        rektion: verb.rektion,
        person,
        promptDe: form.promptDe,
        infinitive: verb.lemma.replace(/^sich\s+/i, ''),
        expectedForms: form.expected,
        fullForm: form.fullForm || form.finite,
        exampleDe: form.de,
        exampleEn: form.en,
        exampleRu: form.ru,
      });
    }
  }
  return items;
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
        message: { en: 'Correct!', ru: 'Верно!' },
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

export function gapCatalogStats(): {
  verbs: number;
  forms: number;
  byLevel: Record<string, number>;
} {
  const byLevel: Record<string, number> = {};
  let forms = 0;
  for (const v of CATALOG) {
    byLevel[v.level] = (byLevel[v.level] ?? 0) + 1;
    forms += Object.keys(v.forms).length;
  }
  return { verbs: CATALOG.length, forms, byLevel };
}
