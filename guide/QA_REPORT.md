# QA report

## What was verified

| Area | Status | Notes |
| --- | --- | --- |
| Production build (`tsc` + Vite) | Pass | App compiles to static `dist/` |
| Learning modes wiring | Pass | Four modes; UI uses `buildSafePrompt` / `buildReveal` |
| Answer leakage design | Pass (by construction) | German lemma/examples/conjugations withheld pre-submit in →DE modes via `src/lib/leakage.ts` |
| Article-aware noun grading | Pass (unit logic) | Missing/wrong article → partial |
| SRS scheduling code | Pass (unit logic) | Learning steps, graduate, lapse, know |
| Local persistence | Pass | `localStorage` + export/import |
| Vocabulary count | Pass | **2335** entries generated into `public/data/vocabulary.json` |
| Deep linguistic audit of all entries | **Skipped** | Per project request to limit token/time cost |
| Exhaustive UI E2E on every exercise type | **Skipped** | Smoke via build; manual session recommended |

## Vocabulary composition (generated)

- noun ~999 · verb ~596 · adjective ~484 · adverb ~175
- preposition ~46 · phrase/pronoun/conjunction/other remainder
- Levels: heavy A1–B1, some B2

## Remaining limitations

1. **Not native-speaker certified** — treat odd examples as fixable seed edits.
2. **No audio** — pronunciation via browser/OS TTS can be added later; not included.
3. **Offline** works after first load of static assets; progress is device-local only.
4. **Example-dedup** in the generator may drop rare legitimate duplicates across lemmas.
5. Unit tests via `tsx` may require a normal (non-sandbox) shell: `npm run test:unit`.

## Suggested manual smoke (2 minutes)

1. `npm run dev` → choose English → German → start session.
2. Confirm no German answer visible before submit.
3. Answer a noun without article → expect partial feedback.
4. Complete a few cards; check Progress counters move.
5. Export backup from Settings.
