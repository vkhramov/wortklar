/**
 * Auto-assign illustration ids for concrete nouns/verbs from the shared catalog.
 * Abstract / unmatched words get no illustration.
 *
 * Usage: node scripts/assign-illustrations.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignIllustration } from './lib/assign-illustration.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const paths = [
  join(root, 'public/data/vocabulary.json'),
  join(root, 'docs/data/vocabulary.json'),
];

const src = paths[0];
const vocab = JSON.parse(readFileSync(src, 'utf8'));
if (!Array.isArray(vocab)) throw new Error('vocabulary.json must be an array');

const counts = new Map();
let assigned = 0;
let cleared = 0;

for (const entry of vocab) {
  const next = assignIllustration(entry);
  if (next) {
    if (entry.illustration !== next) assigned++;
    entry.illustration = next;
    counts.set(next, (counts.get(next) ?? 0) + 1);
  } else if (entry.illustration) {
    delete entry.illustration;
    cleared++;
  }
}

const json = `${JSON.stringify(vocab)}\n`;
for (const p of paths) {
  try {
    writeFileSync(p, json);
  } catch (err) {
    if (p.includes('/docs/')) {
      console.warn(`skip ${p}: ${err.message}`);
    } else {
      throw err;
    }
  }
}

const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
console.log(
  `illustrations: ${counts.size} icons · ${[...counts.values()].reduce((a, b) => a + b, 0)} entries tagged · ${cleared} cleared`,
);
console.log(
  ranked
    .slice(0, 15)
    .map(([id, n]) => `  ${id}: ${n}`)
    .join('\n'),
);
