import type { LearningMode, VocabEntry } from '../types/vocab';
import { producesGerman } from './answer';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Forms of the target that would spoil a →German exercise if left visible. */
function spoilers(entry: VocabEntry): string[] {
  const forms = new Set<string>();
  const lemma = entry.lemma.replace(/^sich\s+/i, '');
  forms.add(lemma);
  if (entry.article) forms.add(entry.article);
  if (entry.plural && entry.plural !== '-') forms.add(entry.plural);
  if (entry.conjugations) {
    for (const v of Object.values(entry.conjugations)) {
      for (const part of v.split(/\s+/)) {
        if (part && !/^(mich|dich|sich|uns|euch|mir|dir)$/i.test(part)) {
          forms.add(part);
        }
      }
    }
  }
  return [...forms].filter((f) => f.length > 1 || entry.pos === 'preposition');
}

/**
 * Example shown before the learner answers.
 * Into-German modes: cloze blanks so the German solution is not leaked.
 * From-German modes: full German example (prompt is already German).
 */
export function exampleBeforeAnswer(
  entry: VocabEntry,
  mode: LearningMode,
): { text: string; cloze: boolean } {
  const de = entry.example.de;
  if (!producesGerman(mode)) {
    return { text: de, cloze: false };
  }

  let text = de;
  const parts = spoilers(entry).sort((a, b) => b.length - a.length);
  for (const form of parts) {
    const re = new RegExp(`\\b${escapeRegExp(form)}\\b`, 'gi');
    text = text.replace(re, '______');
  }
  // Collapse adjacent blanks from article+noun etc.
  text = text.replace(/(______\s*)+/g, '______ ');
  return { text: text.trim(), cloze: true };
}
