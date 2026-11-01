Create a high-quality German vocabulary database for Wortklar.

## Paths
- Project: `/Users/vkhramov/Documents/vkhramov/cursor_project/wortklar`
- Write generator: `scripts/generate-vocab.mjs` (may import `scripts/lib/conjugator.mjs` and seed modules under `scripts/seeds/`)
- Write validator: `scripts/validate-vocab.mjs`
- Output: `public/data/vocabulary.json`
- Content sources doc: `docs/CONTENT_SOURCES.md`

## Target
~2300–2500 excellent entries (prefer quality over padding).

## Entry schema
JSON array of objects:
```
{
  id, lemma, pos, level, topics[], frequency(1-5), en[], ru[],
  example:{de,en,ru}, notes?, illustration?,
  article?, plural?,  // nouns
  conjugations:{ich,du,er,wir,ihr,sie}?, separable?, reflexive?, irregular?, auxiliary?, // verbs
  caseRequired?, wechsel?, caseHint:{en,ru}? // prepositions — caseHint MUST NOT contain German lemma
}
```
pos: noun|verb|adjective|adverb|preposition|conjunction|pronoun|particle|phrase|numeral|determiner
level: A1|A2|B1|B2
topics from: basics people family home housing food drink shopping transport work health time weather nature hobbies travel emotions education technology clothing city money cooking sports animals body descriptions daily-life communication appointments relationships grammar-essentials phrases

## Quality rules
- Practical everyday German; original example sentences; target word in example
- Preposition examples must contain the preposition
- Correct articles/plurals/conjugations/cases
- Natural English AND Russian translations
- Mix ~40% nouns, ~25% verbs, ~15% adj/adv, ~5% prep, rest other
- Heavy A1/A2/B1

## Process
1. Build generator with curated seeds (use conjugator for weak verbs; hardcode strong verbs)
2. Run generator → vocabulary.json
3. Run validator; fix until pass
4. Return counts by POS and any limitations

Do NOT copy commercial app content. All examples original.
