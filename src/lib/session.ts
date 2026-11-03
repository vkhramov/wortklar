import type {
  AppProgress,
  CardProgress,
  SessionItem,
  VocabEntry,
} from '../types/vocab';
import { createNewCard, isDue } from './srs';
import { shuffled } from './shuffle';

function getCard(
  progress: AppProgress,
  entryId: string,
): CardProgress {
  return progress.cards[entryId] ?? createNewCard(entryId);
}

function matchesFilters(entry: VocabEntry, progress: AppProgress): boolean {
  const { topics, levels } = progress.settings;
  if (levels.length && !levels.includes(entry.level)) return false;
  if (topics.length && !entry.topics.some((t) => topics.includes(t))) return false;
  return true;
}

/**
 * Build a session: overdue/learning reviews first, then new words.
 * Target ~40% reviews when enough due items exist; never drop overdue reviews.
 */
export function buildSession(
  vocabulary: VocabEntry[],
  progress: AppProgress,
  now: Date = new Date(),
): SessionItem[] {
  const { sessionSize, newPerSession } = progress.settings;
  const filtered = vocabulary.filter((e) => matchesFilters(e, progress));

  const reviews: SessionItem[] = [];
  const learning: SessionItem[] = [];
  const news: SessionItem[] = [];

  for (const entry of filtered) {
    const card = getCard(progress, entry.id);
    if (card.markedKnown && card.state === 'known') continue;

    if (card.state === 'new' || !card.introducedAt) {
      news.push({
        entry,
        kind: 'new',
        reason: 'New word',
      });
      continue;
    }

    if (!isDue(card, now)) continue;

    if (card.state === 'learning' || card.state === 'relearning') {
      learning.push({
        entry,
        kind: 'relearning',
        reason:
          card.state === 'relearning'
            ? 'Relearning after a miss'
            : 'Still in learning steps',
      });
    } else {
      const due = new Date(card.dueDate);
      const overdueDays = Math.floor(
        (now.getTime() - due.getTime()) / 86_400_000,
      );
      reviews.push({
        entry,
        kind: 'review',
        reason:
          overdueDays > 0
            ? `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`
            : `Scheduled review (${card.interval}d interval)`,
      });
    }
  }

  // Sort reviews: most overdue first, then shorter intervals (harder)
  reviews.sort((a, b) => {
    const ca = getCard(progress, a.entry.id);
    const cb = getCard(progress, b.entry.id);
    return new Date(ca.dueDate).getTime() - new Date(cb.dueDate).getTime();
  });

  // New words: higher frequency first, then lower level
  news.sort((a, b) => {
    if (b.entry.frequency !== a.entry.frequency) {
      return b.entry.frequency - a.entry.frequency;
    }
    const order = { A1: 0, A2: 1, B1: 2, B2: 3 };
    return order[a.entry.level] - order[b.entry.level];
  });

  const dueReviews = [...learning, ...reviews];
  const reviewBudget = Math.max(
    dueReviews.length, // never skip overdue
    Math.min(dueReviews.length, Math.ceil(sessionSize * 0.4)),
  );

  // If many overdue, take them all up to sessionSize
  const forcedReviews = dueReviews.slice(0, sessionSize);
  const reviewSlice =
    dueReviews.length > Math.ceil(sessionSize * 0.4)
      ? forcedReviews
      : dueReviews.slice(0, reviewBudget);

  const remaining = Math.max(0, sessionSize - reviewSlice.length);
  const newCap = Math.min(newPerSession, remaining);
  const newSlice = news.slice(0, newCap);

  // Interleave lightly: review, new, review, new… but keep learning cards early
  const session: SessionItem[] = [];
  const learningFirst = reviewSlice.filter((i) => i.kind === 'relearning');
  const otherReviews = reviewSlice.filter((i) => i.kind !== 'relearning');
  session.push(...learningFirst);

  let ri = 0;
  let ni = 0;
  while (session.length < sessionSize && (ri < otherReviews.length || ni < newSlice.length)) {
    if (ri < otherReviews.length) {
      session.push(otherReviews[ri++]);
    }
    if (session.length >= sessionSize) break;
    if (ni < newSlice.length) {
      session.push(newSlice[ni++]);
    }
  }

  // Same cards each rebuild, random order so sessions don't feel identical
  return shuffled(session);
}

export function countStats(vocabulary: VocabEntry[], progress: AppProgress) {
  let learned = 0;
  let reviewing = 0;
  let due = 0;
  let notStarted = 0;
  let known = 0;

  const now = new Date();
  for (const entry of vocabulary) {
    if (!matchesFilters(entry, progress)) continue;
    const card = progress.cards[entry.id];
    if (!card || card.state === 'new' || !card.introducedAt) {
      notStarted++;
      continue;
    }
    if (card.markedKnown || card.state === 'known') {
      known++;
      learned++;
      continue;
    }
    if (card.state === 'review') {
      reviewing++;
      learned++;
      if (isDue(card, now)) due++;
    } else if (card.state === 'learning' || card.state === 'relearning') {
      reviewing++;
      learned++;
      if (isDue(card, now)) due++;
    }
  }

  return { learned, reviewing, due, notStarted, known, total: vocabulary.length };
}
