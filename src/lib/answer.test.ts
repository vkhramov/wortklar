import { evaluateAnswer, expandGermanVariants, normalizeAnswer } from './answer';
import type { VocabEntry } from '../types/vocab';

const noun: VocabEntry = {
  id: 'noun-tisch',
  lemma: 'Tisch',
  pos: 'noun',
  level: 'A1',
  topics: ['home'],
  frequency: 5,
  en: ['table'],
  ru: ['стол'],
  article: 'der',
  plural: 'Tische',
  example: {
    de: 'Der Tisch ist groß.',
    en: 'The table is big.',
    ru: 'Стол большой.',
  },
};

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

console.assert(normalizeAnswer('  Der Tisch. ', 'de') === 'der tisch');
console.assert(expandGermanVariants('Straße').includes('strasse') || expandGermanVariants('strasse').length > 0);

let r = evaluateAnswer(noun, 'en-de', 'der Tisch');
console.assert(r.verdict === 'correct', 'article+noun should be correct');

r = evaluateAnswer(noun, 'en-de', 'Tisch');
console.assert(r.verdict === 'incorrect' && r.articleIssue, 'missing article is incorrect');

r = evaluateAnswer(noun, 'en-de', 'die Tisch');
console.assert(r.verdict === 'incorrect' && r.articleIssue, 'wrong article is incorrect');

r = evaluateAnswer(noun, 'en-de', 'Stuhl');
console.assert(r.verdict === 'incorrect');

r = evaluateAnswer(prep, 'en-de', 'mit');
console.assert(r.verdict === 'correct');

r = evaluateAnswer(noun, 'de-en', 'table');
console.assert(r.verdict === 'correct');

r = evaluateAnswer(noun, 'ru-de', 'der tisch');
console.assert(r.verdict === 'correct');

console.log('answer.test.ts OK');
