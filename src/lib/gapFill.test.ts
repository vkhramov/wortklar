import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildGapItem,
  evaluateGapAnswer,
  listA1GapItems,
} from './gapFill.ts';
import type { VocabEntry } from '../types/vocab.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const vocabulary = JSON.parse(
  readFileSync(join(root, 'public/data/vocabulary.json'), 'utf8'),
) as VocabEntry[];

const items = listA1GapItems(vocabulary);
console.assert(items.length === 96, `expected 96 A1 gaps, got ${items.length}`);

const fromExample = items.filter((i) => i.source === 'example').length;
console.assert(fromExample >= 80, `too few example clozes: ${fromExample}`);

const wohnen = vocabulary.find(
  (e) => e.lemma === 'wohnen' && e.pos === 'verb',
);
console.assert(wohnen);
const wItem = buildGapItem(wohnen!);
console.assert(wItem);
const ok = evaluateGapAnswer(wItem!, 'wohne');
console.assert(ok.verdict === 'correct', 'wohne should match');

const sein = vocabulary.find((e) => e.id === 'verb-sein');
const sItem = buildGapItem(sein!);
console.assert(sItem?.promptDe.includes('_______'));
console.assert(
  evaluateGapAnswer(sItem!, 'bin').verdict === 'correct',
);

const anfangen = vocabulary.find(
  (e) => e.lemma === 'anfangen' && e.pos === 'verb',
);
const aItem = buildGapItem(anfangen!);
console.assert(aItem?.source === 'example');
console.assert(evaluateGapAnswer(aItem!, 'fängt').verdict === 'correct');
console.assert(evaluateGapAnswer(aItem!, 'fängt an').verdict === 'correct');

console.log('gapFill.test.ts OK', { total: items.length, fromExample });
