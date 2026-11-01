import type { CardProgress, CardState } from '../types/vocab';
import { createNewCard, describeSchedule, isDue } from './srs';

export type WordStatus =
  | 'new'
  | 'learning'
  | 'relearning'
  | 'review'
  | 'due'
  | 'known';

export interface WordStats {
  card: CardProgress;
  status: WordStatus;
  correct: number;
  incorrect: number;
  attempts: number;
  accuracy: number | null;
  strength: number;
  schedule: string;
  introduced: boolean;
}

/** 0–100 strength meter inspired by spaced-repetition “maturity” bars. */
export function wordStrength(card: CardProgress): number {
  if (card.markedKnown || card.state === 'known') return 100;
  if (!card.introducedAt || card.state === 'new') return 0;

  const attempts = card.correctCount + card.incorrectCount;
  const accuracy = attempts ? card.correctCount / attempts : 0.5;

  if (card.state === 'learning' || card.state === 'relearning') {
    return Math.round(
      Math.min(38, 12 + card.learningStep * 12 + accuracy * 14 - card.lapses * 4),
    );
  }

  const intervalScore = Math.min(45, Math.log2(card.interval + 1) * 12);
  const repScore = Math.min(30, card.repetitions * 6);
  const accScore = accuracy * 25;
  const lapsePenalty = Math.min(20, card.lapses * 6);
  return Math.max(
    40,
    Math.min(99, Math.round(intervalScore + repScore + accScore - lapsePenalty)),
  );
}

export function wordStatus(card: CardProgress, now = new Date()): WordStatus {
  if (card.markedKnown || card.state === 'known') return 'known';
  if (!card.introducedAt || card.state === 'new') return 'new';
  if (card.state === 'learning') return 'learning';
  if (card.state === 'relearning') return 'relearning';
  if (isDue(card, now)) return 'due';
  return 'review';
}

export function getWordStats(
  entryId: string,
  cards: Record<string, CardProgress>,
  now = new Date(),
): WordStats {
  const card = cards[entryId] ?? createNewCard(entryId);
  const correct = card.correctCount;
  const incorrect = card.incorrectCount;
  const attempts = correct + incorrect;
  return {
    card,
    status: wordStatus(card, now),
    correct,
    incorrect,
    attempts,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
    strength: wordStrength(card),
    schedule: describeSchedule(card),
    introduced: Boolean(card.introducedAt),
  };
}

export function statusLabel(
  status: WordStatus,
  ui: 'en' | 'ru',
): string {
  const map: Record<WordStatus, { en: string; ru: string }> = {
    new: { en: 'New', ru: 'Новое' },
    learning: { en: 'Learning', ru: 'Изучается' },
    relearning: { en: 'Relearning', ru: 'Переучивается' },
    review: { en: 'Review', ru: 'Повторение' },
    due: { en: 'Due', ru: 'К повторению' },
    known: { en: 'Known', ru: 'Знаю' },
  };
  return map[status][ui];
}

export function stateBucket(state: CardState): WordStatus {
  if (state === 'known') return 'known';
  if (state === 'new') return 'new';
  if (state === 'learning') return 'learning';
  if (state === 'relearning') return 'relearning';
  return 'review';
}
