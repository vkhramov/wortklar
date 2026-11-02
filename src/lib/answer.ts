import type {
  AnswerResult,
  LearningMode,
  VocabEntry,
} from '../types/vocab';

const UMLAUT_MAP: Record<string, string> = {
  ae: 'ä',
  oe: 'ö',
  ue: 'ü',
  ss: 'ß',
  Ae: 'Ä',
  Oe: 'Ö',
  Ue: 'Ü',
};

/** Normalize for comparison without changing meaning. */
export function normalizeAnswer(raw: string, lang: 'de' | 'en' | 'ru'): string {
  let s = raw.trim().replace(/\s+/g, ' ');
  if (lang === 'de' || lang === 'en') {
    s = s.toLowerCase();
  } else {
    s = s.toLowerCase();
  }
  // Strip trailing punctuation
  s = s.replace(/[.!?…]+$/u, '').trim();
  // German article + noun spacing
  s = s.replace(/\s+/g, ' ');
  return s;
}

export function expandGermanVariants(s: string): string[] {
  const base = normalizeAnswer(s, 'de');
  const variants = new Set<string>([base]);

  // ae/oe/ue/ss ↔ umlauts/ß
  const replaceAll = (input: string, from: string, to: string): string =>
    input.split(from).join(to);

  let ascii = base;
  ascii = replaceAll(ascii, 'ä', 'ae');
  ascii = replaceAll(ascii, 'ö', 'oe');
  ascii = replaceAll(ascii, 'ü', 'ue');
  ascii = replaceAll(ascii, 'ß', 'ss');
  variants.add(ascii);

  let umlaut = base;
  // Conservative: only replace common patterns at word ends / known digraphs
  umlaut = umlaut.replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü');
  // ss → ß only when not after short vowel heuristic is hard; accept both if expected has ß
  variants.add(umlaut);

  return [...variants];
}

function stripGermanArticle(s: string): { article: string | null; rest: string } {
  const m = s.match(/^(der|die|das|ein|eine|einen|einem|einer)\s+(.+)$/i);
  if (m) return { article: m[1].toLowerCase(), rest: m[2] };
  return { article: null, rest: s };
}

function expectedGermanForms(entry: VocabEntry): string[] {
  const forms: string[] = [];
  if (entry.pos === 'noun' && entry.article) {
    forms.push(`${entry.article} ${entry.lemma}`);
    forms.push(entry.lemma);
  } else if (entry.pos === 'verb' && entry.reflexive) {
    forms.push(entry.lemma);
    forms.push(`sich ${entry.lemma}`);
  } else {
    forms.push(entry.lemma);
  }
  return forms;
}

function expectedTargetForms(entry: VocabEntry, mode: LearningMode): string[] {
  if (mode === 'ru-de' || mode === 'en-de') {
    return expectedGermanForms(entry);
  }
  if (mode === 'de-ru') return entry.ru;
  return entry.en;
}

function targetLang(mode: LearningMode): 'de' | 'en' | 'ru' {
  if (mode === 'ru-de' || mode === 'en-de') return 'de';
  if (mode === 'de-ru') return 'ru';
  return 'en';
}

export function promptFor(entry: VocabEntry, mode: LearningMode): string {
  switch (mode) {
    case 'ru-de':
      return entry.ru[0];
    case 'en-de':
      return entry.en[0];
    case 'de-ru':
      return entry.pos === 'noun' && entry.article
        ? `${entry.article} ${entry.lemma}`
        : entry.lemma;
    case 'de-en':
      return entry.pos === 'noun' && entry.article
        ? `${entry.article} ${entry.lemma}`
        : entry.lemma;
  }
}

export function producesGerman(mode: LearningMode): boolean {
  return mode === 'ru-de' || mode === 'en-de';
}

export function evaluateAnswer(
  entry: VocabEntry,
  mode: LearningMode,
  rawAnswer: string,
): AnswerResult {
  const lang = targetLang(mode);
  const given = normalizeAnswer(rawAnswer, lang);
  const expectedList = expectedTargetForms(entry, mode);
  const expectedDisplay =
    mode === 'ru-de' || mode === 'en-de'
      ? entry.pos === 'noun' && entry.article
        ? `${entry.article} ${entry.lemma}`
        : entry.lemma
      : expectedList[0];

  if (!given) {
    return {
      verdict: 'incorrect',
      message: {
        en: 'Please type an answer.',
        ru: 'Пожалуйста, введите ответ.',
      },
      expected: expectedDisplay,
      normalizedExpected: normalizeAnswer(expectedDisplay, lang),
      normalizedGiven: given,
    };
  }

  if (lang === 'de') {
    return evaluateGerman(entry, given, expectedDisplay);
  }

  const normalizedExpected = expectedList.map((e) => normalizeAnswer(e, lang));
  const hit = normalizedExpected.some((e) => e === given);
  if (hit) {
    return {
      verdict: 'correct',
      message: {
        en: 'Correct!',
        ru: 'Верно!',
      },
      expected: expectedDisplay,
      normalizedExpected: normalizedExpected[0],
      normalizedGiven: given,
    };
  }

  // Soft match: ignore parentheses content in glosses
  const soft = normalizedExpected.map((e) =>
    e.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(),
  );
  if (soft.includes(given)) {
    return {
      verdict: 'correct',
      message: { en: 'Correct!', ru: 'Верно!' },
      expected: expectedDisplay,
      normalizedExpected: soft[0],
      normalizedGiven: given,
    };
  }

  return {
    verdict: 'incorrect',
    message: {
      en: 'Not quite. Check the correct translation below.',
      ru: 'Не совсем. Правильный перевод ниже.',
    },
    expected: expectedDisplay,
    normalizedExpected: normalizedExpected[0],
    normalizedGiven: given,
  };
}

function evaluateGerman(
  entry: VocabEntry,
  given: string,
  expectedDisplay: string,
): AnswerResult {
  const givenVariants = expandGermanVariants(given);
  const expectedForms = expectedGermanForms(entry);
  const expectedVariants = expectedForms.flatMap((f) => expandGermanVariants(f));

  // Nouns: check article first so lemma-only answers are never fully correct
  if (entry.pos === 'noun' && entry.article) {
    const { article, rest } = stripGermanArticle(given);
    const lemmaVariants = expandGermanVariants(entry.lemma);
    const restVariants = expandGermanVariants(rest);
    const lemmaHit = restVariants.some((r) => lemmaVariants.includes(r));
    if (lemmaHit) {
      if (!article) {
        return {
          verdict: 'incorrect',
          message: {
            en: `Missing article. Correct: ${entry.article} ${entry.lemma}`,
            ru: `Нет артикля. Правильно: ${entry.article} ${entry.lemma}`,
          },
          expected: expectedDisplay,
          normalizedExpected: expandGermanVariants(expectedDisplay)[0],
          normalizedGiven: given,
          articleIssue: true,
        };
      }
      if (article !== entry.article) {
        return {
          verdict: 'incorrect',
          message: {
            en: `Wrong article. Correct: ${entry.article} ${entry.lemma}`,
            ru: `Неверный артикль. Правильно: ${entry.article} ${entry.lemma}`,
          },
          expected: expectedDisplay,
          normalizedExpected: expandGermanVariants(expectedDisplay)[0],
          normalizedGiven: given,
          articleIssue: true,
        };
      }
      return {
        verdict: 'correct',
        message: { en: 'Correct!', ru: 'Верно!' },
        expected: expectedDisplay,
        normalizedExpected: expandGermanVariants(expectedDisplay)[0],
        normalizedGiven: given,
      };
    }
  }

  if (givenVariants.some((g) => expectedVariants.includes(g))) {
    return {
      verdict: 'correct',
      message: { en: 'Correct!', ru: 'Верно!' },
      expected: expectedDisplay,
      normalizedExpected: expandGermanVariants(expectedDisplay)[0],
      normalizedGiven: given,
    };
  }

  return {
    verdict: 'incorrect',
    message: {
      en: 'Not quite. Study the answer and example below.',
      ru: 'Не совсем. Изучите ответ и пример ниже.',
    },
    expected: expectedDisplay,
    normalizedExpected: expandGermanVariants(expectedDisplay)[0],
    normalizedGiven: given,
  };
}

export { UMLAUT_MAP };
