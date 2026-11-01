/** Minimal smoke checks — not a linguistic audit. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(
  fs.readFileSync(path.join(root, 'public/data/vocabulary.json'), 'utf8'),
);

if (data.length < 2300) {
  console.error('Expected at least ~2300 entries, got', data.length);
  process.exit(1);
}

const mit = data.find((e) => e.pos === 'preposition' && e.lemma === 'mit');
if (!mit?.caseHint?.en || /\bmit\b/i.test(mit.caseHint.en)) {
  console.error('mit caseHint missing or leaks lemma');
  process.exit(1);
}

const noun = data.find((e) => e.pos === 'noun' && e.article && e.plural);
if (!noun) {
  console.error('No noun with article/plural');
  process.exit(1);
}

console.log(`Smoke OK — ${data.length} entries`);
