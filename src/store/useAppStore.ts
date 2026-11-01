import { create } from 'zustand';
import type {
  AppProgress,
  DailyStats,
  LearningMode,
  VocabEntry,
} from '../types/vocab';
import type { Grade as SrsGrade } from '../lib/srs';
import { scheduleReview, createNewCard } from '../lib/srs';
import {
  loadProgress,
  saveProgress,
  todayKey,
  updateStreak,
  importProgress as parseImport,
  exportProgress,
} from '../lib/storage';

type GradeInput = SrsGrade;

interface AppState {
  ready: boolean;
  vocabulary: VocabEntry[];
  progress: AppProgress;
  init: () => Promise<void>;
  setMode: (mode: LearningMode) => void;
  updateSettings: (partial: Partial<AppProgress['settings']>) => void;
  applyGrade: (entryId: string, grade: GradeInput) => void;
  recordAnswer: (entryId: string, correct: boolean) => void;
  resetProgress: () => void;
  exportData: () => string;
  importData: (json: string) => void;
}

function bumpDaily(
  progress: AppProgress,
  patch: Partial<DailyStats> & { correctDelta?: number; incorrectDelta?: number; newDelta?: number; reviewDelta?: number },
): DailyStats[] {
  const date = todayKey();
  const daily = [...progress.daily];
  let row = daily.find((d) => d.date === date);
  if (!row) {
    row = { date, reviewsDone: 0, newLearned: 0, correct: 0, incorrect: 0 };
    daily.push(row);
  }
  const idx = daily.findIndex((d) => d.date === date);
  daily[idx] = {
    ...daily[idx],
    reviewsDone: daily[idx].reviewsDone + (patch.reviewDelta ?? 0),
    newLearned: daily[idx].newLearned + (patch.newDelta ?? 0),
    correct: daily[idx].correct + (patch.correctDelta ?? 0),
    incorrect: daily[idx].incorrect + (patch.incorrectDelta ?? 0),
  };
  // Keep last 120 days
  return daily.slice(-120);
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  vocabulary: [],
  progress: loadProgress(),

  init: async () => {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}data/vocabulary.json`);
    const vocabulary = (await res.json()) as VocabEntry[];
    set({ vocabulary, progress: loadProgress(), ready: true });
  },

  setMode: (mode) => {
    const progress = {
      ...get().progress,
      settings: { ...get().progress.settings, mode },
    };
    saveProgress(progress);
    set({ progress });
  },

  updateSettings: (partial) => {
    const progress = {
      ...get().progress,
      settings: { ...get().progress.settings, ...partial },
    };
    saveProgress(progress);
    set({ progress });
  },

  applyGrade: (entryId, grade) => {
    let progress = updateStreak(get().progress);
    const existing = progress.cards[entryId] ?? createNewCard(entryId);
    const wasNew = existing.state === 'new' || !existing.introducedAt;
    const updated = scheduleReview(existing, grade);
    progress = {
      ...progress,
      cards: { ...progress.cards, [entryId]: updated },
      // Accuracy is recorded in recordAnswer (by verdict), not by SRS grade buttons
      daily: bumpDaily(progress, {
        reviewDelta: 1,
        newDelta: wasNew && grade !== 'again' && grade !== 'know' ? 1 : 0,
      }),
    };
    saveProgress(progress);
    set({ progress });
  },

  recordAnswer: (entryId, correct) => {
    const existing = get().progress.cards[entryId] ?? createNewCard(entryId);
    const card = {
      ...existing,
      correctCount: existing.correctCount + (correct ? 1 : 0),
      incorrectCount: existing.incorrectCount + (correct ? 0 : 1),
    };
    const progress = {
      ...get().progress,
      cards: { ...get().progress.cards, [entryId]: card },
      daily: bumpDaily(get().progress, {
        correctDelta: correct ? 1 : 0,
        incorrectDelta: correct ? 0 : 1,
      }),
    };
    saveProgress(progress);
    set({ progress });
  },

  resetProgress: () => {
    const { settings } = get().progress;
    const progress = {
      cards: {},
      streak: 0,
      lastStudyDate: null,
      daily: [],
      settings,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    saveProgress(progress);
    set({ progress });
  },

  exportData: () => exportProgress(get().progress),

  importData: (json) => {
    const progress = parseImport(json);
    saveProgress(progress);
    set({ progress });
  },
}));

// Re-export grade type alias for UI
export type { GradeInput as Grade };
