# Wortklar — Architecture

## Product

**Wortklar** (“word-clear”) is a local-first German vocabulary trainer for Russian- and English-speaking learners. It prioritises active recall into German, spaced repetition, natural example sentences, and strict prevention of answer leakage.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19 + TypeScript + Vite | Fast SPA, free static hosting |
| Routing | react-router-dom | Simple multi-page UX |
| State | Zustand + `localStorage` | No backend, no account, zero ops cost |
| SRS | Anki-inspired SM-2 with learning steps | Transparent, proven, no ML training data required |
| Vocabulary | Static `public/data/vocabulary.json` | Offline-capable, easy to audit |
| Illustrations | Inline SVG icons | No CDN, no copyrighted stock art |

FSRS was considered (often better retention efficiency than SM-2). For a local app without a large personal review history to fit, a transparent SM-2 variant with explicit learning steps is easier to explain and maintain. Intervals remain visible via card metadata / session reasons.

## Learning modes

Four exclusive directions: `ru-de`, `en-de`, `de-ru`, `de-en`.

Pre-answer UI is built only through `buildSafePrompt()` (`src/lib/leakage.ts`). When the learner must produce German, German orthography of the target (lemma, examples, conjugations, `mit + Dativ`-style labels) is withheld until after evaluation.

## Session composition

`buildSession()` mixes:

1. Learning / relearning cards due now
2. Review cards (overdue first)
3. New cards (frequency + CEFR ordered)

Reviews are allowed to exceed the ~40% guideline when the overdue queue requires it.

## Persistence

Progress lives in `localStorage` key `wortklar-progress-v1`. Export/import JSON backups are available in Settings. No personal data is collected; no analytics SDK is included.

## Deployment cost

Static files only. Suitable for GitHub Pages, Netlify, Cloudflare Pages, or opening a local `npm run preview` build. Recurring cost: **$0**.
