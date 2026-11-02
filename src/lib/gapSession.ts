import type { AppProgress, VocabEntry } from '../types/vocab';
import { createNewCard, isDue } from './srs';
import { listA1GapItems, type GapFillItem } from './gapFill';

export type GapSessionItem = {
  gap: GapFillItem;
  kind: 'new' | 'review' | 'relearning';
  reason: string;
};

function getCard(progress: AppProgress, cardId: string) {
  return progress.cards[cardId] ?? createNewCard(cardId);
}

/**
 * Session for A1 verb gap-fill: overdue/learning first, then new by frequency.
 * Reuses the same SRS cards map with keys gap:verb-*.
 */
export function buildGapSession(
  vocabulary: VocabEntry[],
  progress: AppProgress,
  now: Date = new Date(),
): GapSessionItem[] {
  const { sessionSize, newPerSession } = progress.settings;
  const items = listA1GapItems(vocabulary);

  const learning: GapSessionItem[] = [];
  const reviews: GapSessionItem[] = [];
  const news: GapSessionItem[] = [];

  for (const gap of items) {
    const card = getCard(progress, gap.cardId);
    if (card.markedKnown && card.state === 'known') continue;

    if (card.state === 'new' || !card.introducedAt) {
      news.push({ gap, kind: 'new', reason: 'New form' });
      continue;
    }

    if (!isDue(card, now)) continue;

    if (card.state === 'learning' || card.state === 'relearning') {
      learning.push({
        gap,
        kind: 'relearning',
        reason:
          card.state === 'relearning'
            ? 'Relearning after a miss'
            : 'Still in learning steps',
      });
    } else {
      reviews.push({
        gap,
        kind: 'review',
        reason: `Scheduled review (${card.interval}d)`,
      });
    }
  }

  reviews.sort((a, b) => {
    const ca = getCard(progress, a.gap.cardId);
    const cb = getCard(progress, b.gap.cardId);
    return new Date(ca.dueDate).getTime() - new Date(cb.dueDate).getTime();
  });

  const dueReviews = [...learning, ...reviews];
  const reviewBudget = Math.max(
    dueReviews.length,
    Math.min(dueReviews.length, Math.ceil(sessionSize * 0.4)),
  );
  const forcedReviews = dueReviews.slice(0, sessionSize);
  const reviewSlice =
    dueReviews.length > Math.ceil(sessionSize * 0.4)
      ? forcedReviews
      : dueReviews.slice(0, reviewBudget);

  const remaining = Math.max(0, sessionSize - reviewSlice.length);
  const newCap = Math.min(newPerSession, remaining);
  const newSlice = news.slice(0, newCap);

  const session: GapSessionItem[] = [];
  const learningFirst = reviewSlice.filter((i) => i.kind === 'relearning');
  const otherReviews = reviewSlice.filter((i) => i.kind !== 'relearning');
  session.push(...learningFirst);

  let ri = 0;
  let ni = 0;
  while (
    session.length < sessionSize &&
    (ri < otherReviews.length || ni < newSlice.length)
  ) {
    if (ri < otherReviews.length) session.push(otherReviews[ri++]);
    if (session.length >= sessionSize) break;
    if (ni < newSlice.length) session.push(newSlice[ni++]);
  }

  return session;
}

export function countGapStats(
  vocabulary: VocabEntry[],
  progress: AppProgress,
): { total: number; due: number; learned: number; known: number } {
  const items = listA1GapItems(vocabulary);
  let due = 0;
  let learned = 0;
  let known = 0;
  const now = new Date();
  for (const gap of items) {
    const card = progress.cards[gap.cardId];
    if (!card || card.state === 'new' || !card.introducedAt) continue;
    if (card.markedKnown || card.state === 'known') {
      known++;
      continue;
    }
    learned++;
    if (isDue(card, now)) due++;
  }
  return { total: items.length, due, learned, known };
}
