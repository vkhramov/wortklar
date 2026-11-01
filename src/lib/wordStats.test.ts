import { createNewCard, scheduleReview } from './srs';
import { getWordStats, wordStrength } from './wordStats';

const fresh = createNewCard('a');
console.assert(wordStrength(fresh) === 0);
console.assert(getWordStats('a', {}).status === 'new');
console.assert(getWordStats('a', {}).accuracy === null);

let card = scheduleReview(createNewCard('b'), 'good');
card = { ...card, correctCount: 3, incorrectCount: 1 };
const stats = getWordStats('b', { b: card });
console.assert(stats.accuracy === 75);
console.assert(stats.strength > 0 && stats.strength < 100);

const known = scheduleReview(createNewCard('c'), 'know');
console.assert(wordStrength(known) === 100);
console.assert(getWordStats('c', { c: known }).status === 'known');

console.log('wordStats.test.ts OK');
