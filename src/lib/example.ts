import type { LearningMode, VocabEntry } from '../types/vocab';
import { producesGerman } from './answer';
import { uiLangFromMode } from './leakage';

/**
 * Example shown before the learner answers.
 * Into-German modes: L1 example only (EN or RU) — never German, so the
 * answer cannot leak.
 * From-German modes: German example without its translation.
 */
export function exampleBeforeAnswer(
  entry: VocabEntry,
  mode: LearningMode,
): { text: string; lang: 'en' | 'ru' | 'de' } {
  if (producesGerman(mode)) {
    const lang = uiLangFromMode(mode);
    return { text: entry.example[lang], lang };
  }
  return { text: entry.example.de, lang: 'de' };
}
