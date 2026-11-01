# Content sources & licences

## Summary

| Content | Origin | Status |
| --- | --- | --- |
| Lemmas (headwords) | Hand-selected practical, high-frequency everyday German (home, work, transport, shopping, health, appointments, …), CEFR A1–B2 | Single words are not copyrightable; no word list was copied wholesale |
| Example sentences (DE / EN / RU) | Written from scratch for Wortklar | Original |
| English & Russian glosses | Written for Wortklar | Original |
| Articles, plurals, case government, auxiliaries | Standard German grammar (comparable to school grammars / open references such as Wiktionary) | Facts of the language |
| Present-tense conjugations | `scripts/lib/conjugator.mjs` (weak verbs and stem-change helper) plus explicit tables for modal, auxiliary, mixed and strong verbs | Original code/data |
| Illustrations | Inline SVG icons in `src/components/Illustration.tsx`, attached only where the icon literally depicts the word | Original |
| Level / frequency labels | Editorial judgement (CEFR A1–B2; frequency 1 = rare … 5 = essential) | Approximate, original |

## What was *not* used

- No text, example sentences, translations, audio or images were copied from commercial apps or courses (Anki shared decks, Memrise, Babbel, Busuu, Duolingo, Drops, Lingvist, Clozemaster, Quizlet, …).
- No commercial dictionary or coursebook word list (Duden, Langenscheidt, PONS, Collins, Oxford, …) was scraped or reproduced.
- Goethe-Institut / telc CEFR lists were used only as **conceptual calibration** for level tagging, not copied as content.

## How the data is produced

1. Hand-written seed modules live in `scripts/seeds/` (row arrays: `NOUNS`, `VERBS`, `ADJECTIVES`, `ADVERBS`, `PREPOSITIONS`, `OTHER`, or compact text seeds — see the header of `scripts/generate-vocab.mjs`).
2. `scripts/generate-vocab.mjs` merges them into `public/data/vocabulary.json`:
   - expands articles/plurals, case hints, ids and frequency;
   - conjugates weak verbs with `scripts/lib/conjugator.mjs`, uses hardcoded forms for strong/irregular verbs, and adds separable prefixes and reflexive pronouns to every form;
   - strips disambiguation labels from lemmas (e.g. `(Konjunktion)`), de-duplicates lemmas and example sentences;
   - applies editorial patches from `scripts/seeds/_patches.mjs` (corrections, unique examples);
   - curates out the least useful B1/B2 adjectives and adverbs (frequency ≤ 3 / ≤ 2) to keep the deck practical and close to the target part-of-speech mix;
   - attaches illustration icons only from a curated lemma → icon map.
3. `scripts/validate-vocab.mjs` checks schema, topic whitelist, that `example.de` contains the target (or an inflected form), article/suffix sanity for nouns, conjugation shape and known strong-verb forms, preposition case data, notes safety, duplicates and the part-of-speech / level mix.

```bash
export PATH="$HOME/.local/node/bin:$PATH"
node scripts/generate-vocab.mjs
node scripts/validate-vocab.mjs
```

## Answer-leakage policy for content

Anything shown *before* the learner answers must not reveal the German target when producing German:

- `caseHint` (prepositions) is written in English/Russian only and never contains the German preposition.
- `notes` may contain German examples only if they contain the lemma itself, so the leakage guard in `src/lib/leakage.ts` hides them until after the answer. The validator enforces this.
- German forms (plural, conjugations, examples) are revealed only after evaluation.

## Illustrations

- Inline **SVG icons** shipped with the app (`src/components/Illustration.tsx`).
- No third-party stock photos or proprietary illustration packs.

## Software

- Application code: project-local; use freely for personal learning.
- Dependencies: see `package.json` (MIT / permissive OSS licences of React, Vite, Zustand, etc.).

## Honest quality note

Entries were produced via curated seed modules plus automated expansion and structural validation. **They have not all been reviewed by a native speaker.** Automated checks guarantee structure and consistency, not linguistic certification. Known limitations:

- Prepositions are only ~2% of the deck (all common ones are covered; German simply has few more).
- Variant plurals/genders (e.g. *Wörter* / *Worte*, *der/das Joghurt*) list the most common everyday form only.
- Frequency (1–5) and CEFR levels are editorial estimates, not corpus statistics or official lists.
- Please report mistakes so they can be corrected in `scripts/seeds/`.

## Adding or changing content

1. Add rows to a seed file in `scripts/seeds/` (formats: header of `scripts/generate-vocab.mjs`).
2. Write original example sentences; the target word (or an inflected form) must appear in `example.de`, and every example sentence must be unique.
3. Run the generator and validator; fix every error.
4. Never paste content from copyrighted sources.
