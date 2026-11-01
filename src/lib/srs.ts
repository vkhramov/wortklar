/**
 * Wortklar SRS — Anki-inspired SM-2 variant with learning steps.
 * Transparent intervals; overdue reviews get priority; new cards capped.
 */
import type { CardProgress, CardState } from '../types/vocab';

const LEARNING_STEPS_MINUTES = [1, 10];
const GRADUATING_INTERVAL_DAYS = 1;
const EASY_INTERVAL_DAYS = 4;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;
const LAPSE_INTERVAL_MULTIPLIER = 0.0; // reset to relearning

function isoDate(d: Date = new Date()): string {
  return d.toISOString();
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function createNewCard(entryId: string): CardProgress {
  return {
    entryId,
    state: 'new',
    easeFactor: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    learningStep: 0,
    dueDate: isoDate(),
    lastReview: null,
    lapses: 0,
    correctCount: 0,
    incorrectCount: 0,
    markedKnown: false,
    introducedAt: null,
  };
}

export type Grade = 'again' | 'hard' | 'good' | 'easy' | 'know';

export function isDue(card: CardProgress, now: Date = new Date()): boolean {
  if (card.markedKnown && card.state === 'known') return false;
  return new Date(card.dueDate).getTime() <= now.getTime();
}

export function daysOverdue(card: CardProgress, now: Date = new Date()): number {
  const due = startOfDay(new Date(card.dueDate));
  const today = startOfDay(now);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

export function scheduleReview(
  card: CardProgress,
  grade: Grade,
  now: Date = new Date(),
): CardProgress {
  const next: CardProgress = {
    ...card,
    lastReview: isoDate(now),
  };

  if (grade === 'know') {
    return {
      ...next,
      state: 'known',
      markedKnown: true,
      dueDate: isoDate(addDays(now, 3650)),
      interval: 3650,
      repetitions: Math.max(card.repetitions, 1),
      introducedAt: card.introducedAt ?? isoDate(now),
      // Answer tallies come from recordAnswer (typed verdict), not grade buttons
    };
  }

  if (!card.introducedAt) {
    next.introducedAt = isoDate(now);
  }

  const inLearning =
    card.state === 'new' ||
    card.state === 'learning' ||
    card.state === 'relearning';

  if (grade === 'again') {
    next.lapses = card.state === 'review' ? card.lapses + 1 : card.lapses;
    next.easeFactor = Math.max(MIN_EASE, card.easeFactor - 0.2);
    next.learningStep = 0;
    next.state = card.state === 'review' ? 'relearning' : 'learning';
    next.interval = LAPSE_INTERVAL_MULTIPLIER;
    next.dueDate = isoDate(addMinutes(now, LEARNING_STEPS_MINUTES[0]));
    return next;
  }

  if (inLearning) {
    if (grade === 'easy') {
      next.state = 'review';
      next.learningStep = 0;
      next.repetitions = 1;
      next.interval = EASY_INTERVAL_DAYS;
      next.easeFactor = Math.min(3.0, card.easeFactor + 0.15);
      next.dueDate = isoDate(addDays(now, EASY_INTERVAL_DAYS));
      return next;
    }

    const step = card.learningStep;
    if (step < LEARNING_STEPS_MINUTES.length - 1) {
      next.state = 'learning';
      next.learningStep = step + 1;
      next.dueDate = isoDate(
        addMinutes(now, LEARNING_STEPS_MINUTES[next.learningStep]),
      );
      return next;
    }

    // Graduate
    next.state = 'review';
    next.learningStep = 0;
    next.repetitions = 1;
    next.interval =
      grade === 'hard' ? Math.max(1, GRADUATING_INTERVAL_DAYS) : GRADUATING_INTERVAL_DAYS;
    if (grade === 'hard') {
      next.easeFactor = Math.max(MIN_EASE, card.easeFactor - 0.15);
    }
    next.dueDate = isoDate(addDays(now, next.interval));
    return next;
  }

  // Review stage (SM-2-like)
  let ease = card.easeFactor;
  if (grade === 'hard') ease = Math.max(MIN_EASE, ease - 0.15);
  if (grade === 'easy') ease = Math.min(3.0, ease + 0.15);
  next.easeFactor = ease;

  let interval: number;
  if (card.repetitions === 0) {
    interval = GRADUATING_INTERVAL_DAYS;
  } else if (card.repetitions === 1) {
    interval = grade === 'hard' ? 3 : grade === 'easy' ? 7 : 6;
  } else {
    const overdueBonus = Math.max(0, daysOverdue(card, now));
    const base = (card.interval + overdueBonus * 0.25) * ease;
    interval = Math.round(grade === 'hard' ? base * 0.8 : grade === 'easy' ? base * 1.3 : base);
  }

  interval = Math.max(1, interval);
  next.repetitions = card.repetitions + 1;
  next.interval = interval;
  next.state = 'review';
  next.dueDate = isoDate(addDays(now, interval));
  return next;
}

export function describeSchedule(card: CardProgress): string {
  if (card.markedKnown) return 'Marked as already known';
  if (card.state === 'new') return 'New word';
  if (card.state === 'learning' || card.state === 'relearning') {
    return `Learning step ${card.learningStep + 1}/${LEARNING_STEPS_MINUTES.length}`;
  }
  if (card.interval === 1) return 'Review tomorrow';
  return `Review in ${card.interval} days`;
}

export function classifyCard(card: CardProgress | undefined): CardState {
  if (!card) return 'new';
  return card.state;
}
