import { buildSafePrompt } from './leakage';
import type { VocabEntry } from '../types/vocab';

const prep: VocabEntry = {
  id: 'prep-mit',
  lemma: 'mit',
  pos: 'preposition',
  level: 'A1',
  topics: ['grammar-essentials'],
  frequency: 5,
  en: ['with'],
  ru: ['с'],
  caseRequired: 'Dativ',
  caseHint: {
    en: 'Always takes the dative case.',
    ru: 'Всегда требует дательный падеж.',
  },
  example: {
    de: 'Ich fahre mit dem Bus.',
    en: 'I go by bus.',
    ru: 'Я еду на автобусе.',
  },
};

const view = buildSafePrompt(prep, 'en-de');
console.assert(view.prompt === 'with');
console.assert(!view.safeHints.some((h) => /\bmit\b/i.test(h)), 'must not leak mit');
console.assert(view.safeHints.some((h) => /dative/i.test(h)));

const multi: VocabEntry = {
  id: 'adjective-gross',
  lemma: 'groß',
  pos: 'adjective',
  level: 'A1',
  topics: ['descriptions'],
  frequency: 5,
  en: ['big', 'tall'],
  ru: ['большой', 'высокий'],
  example: {
    de: 'Mein Bruder ist sehr groß.',
    en: 'My brother is very tall.',
    ru: 'Мой брат очень высокий.',
  },
};
const multiEn = buildSafePrompt(multi, 'en-de');
console.assert(
  multiEn.prompt === 'big / tall',
  `expected all senses, got: ${multiEn.prompt}`,
);
const multiRu = buildSafePrompt(multi, 'ru-de');
console.assert(
  multiRu.prompt === 'большой / высокий',
  `expected all senses, got: ${multiRu.prompt}`,
);

const noun: VocabEntry = {
  id: 'noun-haus',
  lemma: 'Haus',
  pos: 'noun',
  level: 'A1',
  topics: ['home'],
  frequency: 5,
  en: ['house'],
  ru: ['дом'],
  article: 'das',
  plural: 'Häuser',
  example: { de: 'Das Haus ist alt.', en: 'The house is old.', ru: 'Дом старый.' },
};

const v2 = buildSafePrompt(noun, 'ru-de');
console.assert(v2.prompt === 'дом');
console.assert(!JSON.stringify(v2).includes('Haus'));
// "das" may appear in the generic article hint (der/die/das), which does not reveal the answer
console.assert(!/\bHaus\b/.test(JSON.stringify(v2)));

console.log('leakage.test.ts OK');
