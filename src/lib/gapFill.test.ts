import {
  evaluateGapAnswer,
  gapCatalogStats,
  listGapItems,
} from './gapFill.ts';

const stats = gapCatalogStats();
console.assert(stats.verbs === 332, `verbs ${stats.verbs}`);
console.assert(stats.forms === 1992, `forms ${stats.forms}`);

const all = listGapItems();
console.assert(all.length === stats.forms, 'list length mismatch');

const a1 = listGapItems(['A1']);
console.assert(a1.length > 400, `A1 forms ${a1.length}`);
console.assert(a1.every((i) => i.level === 'A1'));

const seinIch = all.find((i) => i.lemma === 'sein' && i.person === 'ich');
console.assert(seinIch);
console.assert(seinIch!.promptDe.includes('_______'));
console.assert(evaluateGapAnswer(seinIch!, 'bin').verdict === 'correct');

const habenDu = all.find((i) => i.lemma === 'haben' && i.person === 'du');
console.assert(habenDu);
console.assert(
  evaluateGapAnswer(habenDu!, 'hast').verdict === 'correct' ||
    evaluateGapAnswer(habenDu!, 'Hast').verdict === 'correct',
);

console.log('gapFill.test.ts OK', stats, { totalItems: all.length, a1: a1.length });
