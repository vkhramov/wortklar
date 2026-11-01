import { exampleBeforeAnswer } from './example';
import type { VocabEntry } from '../types/vocab';

const gross: VocabEntry = {
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

const enDe = exampleBeforeAnswer(gross, 'en-de');
console.assert(enDe.lang === 'en');
console.assert(enDe.text === 'My brother is very tall.');
console.assert(!/groß|gross/i.test(enDe.text), 'must not leak German before answer');

const ruDe = exampleBeforeAnswer(gross, 'ru-de');
console.assert(ruDe.lang === 'ru');
console.assert(ruDe.text === 'Мой брат очень высокий.');
console.assert(!/groß/i.test(ruDe.text));

const deEn = exampleBeforeAnswer(gross, 'de-en');
console.assert(deEn.lang === 'de');
console.assert(deEn.text.includes('groß'));

console.log('example.test.ts OK');
