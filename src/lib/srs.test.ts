import { createNewCard, scheduleReview, isDue, resumeFromKnown } from './srs';

let card = createNewCard('x');
console.assert(card.state === 'new');
console.assert(isDue(card));

card = scheduleReview(card, 'good');
console.assert(card.state === 'learning');
console.assert(card.learningStep === 1);

card = scheduleReview(card, 'good');
console.assert(card.state === 'review');
console.assert(card.interval >= 1);

const before = card.interval;
card = scheduleReview(card, 'good');
console.assert(card.interval >= before);

card = scheduleReview(card, 'again');
console.assert(card.state === 'relearning');

card = scheduleReview(createNewCard('y'), 'know');
console.assert(card.markedKnown && card.state === 'known');

card = resumeFromKnown(card);
console.assert(!card.markedKnown && card.state === 'learning');
console.assert(isDue(card));

console.log('srs.test.ts OK');
