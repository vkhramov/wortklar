/**
 * Systematic answer-leakage prevention.
 * When the learner must produce German, never expose German orthography
 * of the target (or German-bearing grammar labels) before submission.
 */
import type { LearningMode, VocabEntry } from '../types/vocab';
import { producesGerman } from './answer';
import { resolveIllustrationId } from './illustrations';

export interface SafePromptView {
  prompt: string;
  promptLang: 'en' | 'ru' | 'de';
  answerLang: 'en' | 'ru' | 'de';
  posLabel: string;
  /** Language-neutral hints only — never contains German target forms. */
  safeHints: string[];
  level: string;
  topics: string[];
}

function posLabel(entry: VocabEntry, uiLang: 'en' | 'ru'): string {
  const map: Record<string, { en: string; ru: string }> = {
    noun: { en: 'Noun', ru: 'Существительное' },
    verb: { en: 'Verb', ru: 'Глагол' },
    adjective: { en: 'Adjective', ru: 'Прилагательное' },
    adverb: { en: 'Adverb', ru: 'Наречие' },
    preposition: { en: 'Preposition', ru: 'Предлог' },
    conjunction: { en: 'Conjunction', ru: 'Союз' },
    pronoun: { en: 'Pronoun', ru: 'Местоимение' },
    particle: { en: 'Particle', ru: 'Частица' },
    phrase: { en: 'Phrase', ru: 'Выражение' },
    numeral: { en: 'Numeral', ru: 'Числительное' },
    determiner: { en: 'Determiner', ru: 'Определитель' },
  };
  return map[entry.pos]?.[uiLang] ?? entry.pos;
}

export function uiLangFromMode(mode: LearningMode): 'en' | 'ru' {
  return mode.startsWith('ru') || mode.endsWith('ru') ? 'ru' : 'en';
}

/**
 * Build a pre-answer view that cannot leak the German solution
 * when the learner is translating into German.
 */
export function buildSafePrompt(
  entry: VocabEntry,
  mode: LearningMode,
): SafePromptView {
  const ui = uiLangFromMode(mode);
  const intoGerman = producesGerman(mode);

  let prompt: string;
  let promptLang: 'en' | 'ru' | 'de';
  let answerLang: 'en' | 'ru' | 'de';

  switch (mode) {
    case 'ru-de':
      // All senses so the prompt matches the example (e.g. большой / высокий)
      prompt = entry.ru.join(' / ');
      promptLang = 'ru';
      answerLang = 'de';
      break;
    case 'en-de':
      // All senses so the prompt matches the example (e.g. big / tall)
      prompt = entry.en.join(' / ');
      promptLang = 'en';
      answerLang = 'de';
      break;
    case 'de-ru':
      prompt =
        entry.pos === 'noun' && entry.article
          ? `${entry.article} ${entry.lemma}`
          : entry.lemma;
      promptLang = 'de';
      answerLang = 'ru';
      break;
    case 'de-en':
      prompt =
        entry.pos === 'noun' && entry.article
          ? `${entry.article} ${entry.lemma}`
          : entry.lemma;
      promptLang = 'de';
      answerLang = 'en';
      break;
  }

  const safeHints: string[] = [];

  if (intoGerman) {
    // Never show: German lemma, example.de, conjugations, "mit + Dativ", etc.
    if (entry.pos === 'noun') {
      safeHints.push(
        ui === 'ru'
          ? 'В ответе укажите артикль (der / die / das) и слово.'
          : 'Include the article (der / die / das) with the noun.',
      );
    }
    if (entry.pos === 'preposition' && entry.caseHint) {
      // caseHint is required to be language-neutral and must not contain the German word
      safeHints.push(ui === 'ru' ? entry.caseHint.ru : entry.caseHint.en);
    }
    if (entry.pos === 'verb') {
      if (entry.reflexive) {
        safeHints.push(
          ui === 'ru' ? 'Возвратный глагол.' : 'This is a reflexive verb.',
        );
      }
      if (entry.separable) {
        safeHints.push(
          ui === 'ru'
            ? 'Отделяемая приставка (в предложении приставка уходит в конец).'
            : 'Separable-prefix verb (prefix moves to the end in main clauses).',
        );
      }
      if (entry.irregular) {
        safeHints.push(
          ui === 'ru' ? 'Неправильный глагол.' : 'Irregular verb.',
        );
      }
    }
    if (entry.notes) {
      // Only show notes that do not contain Latin German orthography of the lemma
      const note = ui === 'ru' ? entry.notes.ru : entry.notes.en;
      if (note && !containsGermanLemma(note, entry.lemma)) {
        safeHints.push(note);
      }
    }
  } else {
    // German → L1: German is the prompt; hints OK if they don't spoil L1 answer
    if (entry.pos === 'preposition' && entry.caseRequired) {
      safeHints.push(
        ui === 'ru'
          ? `Падеж: ${entry.caseRequired}`
          : `Case: ${entry.caseRequired}`,
      );
    }
  }

  return {
    prompt,
    promptLang,
    answerLang,
    posLabel: posLabel(entry, ui),
    safeHints,
    level: entry.level,
    topics: entry.topics,
  };
}

/**
 * Unicode-aware check (JS `\b` is ASCII-only, so it misses lemmas such as
 * "über"/"für"). Multi-part lemmas ("entweder … oder", "sich freuen") are
 * split into words and any standalone occurrence hides the note.
 */
function containsGermanLemma(text: string, lemma: string): boolean {
  const parts = lemma.split(/[^\p{L}]+/u).filter(Boolean);
  const candidates = [lemma, ...parts];
  return candidates.some((c) => {
    const re = new RegExp(
      `(?<![\\p{L}])${escapeRegExp(c)}(?![\\p{L}])`,
      'iu',
    );
    return re.test(text);
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Post-answer reveal payload — German content allowed here. */
export function buildReveal(entry: VocabEntry, mode: LearningMode) {
  const ui = uiLangFromMode(mode);
  return {
    lemma:
      entry.pos === 'noun' && entry.article
        ? `${entry.article} ${entry.lemma}`
        : entry.lemma,
    plural: entry.plural,
    conjugations: entry.conjugations,
    example: entry.example,
    en: entry.en,
    ru: entry.ru,
    grammar: grammarLines(entry, ui),
    illustration: resolveIllustrationId(entry),
    caseRequired: entry.caseRequired,
    wechsel: entry.wechsel,
  };
}

function grammarLines(entry: VocabEntry, ui: 'en' | 'ru'): string[] {
  const lines: string[] = [];
  if (entry.pos === 'noun' && entry.article && entry.plural) {
    lines.push(
      ui === 'ru'
        ? `Мн. ч.: ${entry.plural === '-' ? 'редко / нет' : entry.plural}`
        : `Plural: ${entry.plural === '-' ? 'rare / none' : entry.plural}`,
    );
  }
  if (entry.pos === 'preposition') {
    if (entry.wechsel) {
      lines.push(
        ui === 'ru'
          ? 'Wechselpräposition: Dativ при месте (Wo?), Akkusativ при направлении (Wohin?).'
          : 'Two-way preposition: dative for location (Wo?), accusative for destination (Wohin?).',
      );
    } else if (entry.caseRequired) {
      lines.push(
        ui === 'ru'
          ? `Требует падеж: ${entry.caseRequired}`
          : `Requires: ${entry.caseRequired}`,
      );
    }
  }
  if (entry.pos === 'verb') {
    const flags: string[] = [];
    if (entry.irregular) flags.push(ui === 'ru' ? 'неправильный' : 'irregular');
    if (entry.separable) flags.push(ui === 'ru' ? 'отделяемый' : 'separable');
    if (entry.reflexive) flags.push(ui === 'ru' ? 'возвратный' : 'reflexive');
    if (entry.auxiliary) {
      flags.push(
        ui === 'ru'
          ? `Perfekt с ${entry.auxiliary}`
          : `perfect with ${entry.auxiliary}`,
      );
    }
    if (flags.length) lines.push(flags.join(' · '));
  }
  if (entry.notes) {
    const n = ui === 'ru' ? entry.notes.ru : entry.notes.en;
    if (n) lines.push(n);
  }
  return lines;
}
