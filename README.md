# Wortklar

**Everyday German vocabulary, remembered for good.**

Wortklar is a polished, local-first German vocabulary trainer for learners who speak English and/or Russian. It combines typed active recall, a transparent spaced-repetition scheduler, carefully written example sentences, and strict answer-leakage prevention.

## Features

- ~2,300+ practical vocabulary entries (CEFR A1–B2 focus)
- Four exclusive modes: EN→DE, RU→DE, DE→EN, DE→RU
- Typed answers with article-aware noun checking and umlaut helpers
- SM-2–style SRS with learning steps, overdue handling, and “Already know”
- Progress, streaks, accuracy, and topic coverage — without noisy gamification
- SVG illustrations for concrete nouns/actions only
- No account, no cloud dependency, $0 hosting

## Quick start

```bash
npm install
npm run dev
```

Then open the local URL. See [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | How to learn with Wortklar |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Product & technical decisions |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Run & host for free |
| [CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md) | Licensing & content provenance |
| [QA_REPORT.md](docs/QA_REPORT.md) | What was tested and limitations |
| [RESEARCH.md](docs/RESEARCH.md) | Learning-product research notes |

## Scripts

```bash
npm run vocab:generate
npm run vocab:validate
npm run test:unit
npm run build
npm run qa
```

## Brand

Deep teal primary, warm accent for emphasis, Sora (UI) + Literata (linguistic text). Adult, calm, clarity-first — not a children’s game UI.
