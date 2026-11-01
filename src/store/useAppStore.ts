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
  createEmptyProgress,
} from '../lib/storage';
import {
  type AuthUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  migrateLegacyProgressIfNeeded,
  registerUser,
} from '../lib/auth';

type GradeInput = SrsGrade;

interface AppState {
  ready: boolean;
  vocabulary: VocabEntry[];
  progress: AppProgress;
  user: AuthUser | null;
  init: () => Promise<void>;
  register: (username: string, password: string) => Promise<string | null>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
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
  patch: Partial<DailyStats> & {
    correctDelta?: number;
    incorrectDelta?: number;
    newDelta?: number;
    reviewDelta?: number;
  },
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
  return daily.slice(-120);
}

function requireUser(): AuthUser {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');
  return user;
}

function activateUserSession(): { user: AuthUser; progress: AppProgress } {
  const user = requireUser();
  migrateLegacyProgressIfNeeded(user.id);
  const progress = loadProgress();
  return { user, progress };
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  vocabulary: [],
  progress: createEmptyProgress(),
  user: null,

  init: async () => {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}data/vocabulary.json`);
    const vocabulary = (await res.json()) as VocabEntry[];
    const existing = getCurrentUser();
    if (existing) {
      migrateLegacyProgressIfNeeded(existing.id);
      set({
        vocabulary,
        user: existing,
        progress: loadProgress(),
        ready: true,
      });
      return;
    }
    set({ vocabulary, user: null, progress: createEmptyProgress(), ready: true });
  },

  register: async (username, password) => {
    const result = await registerUser(username, password);
    if (!result.ok) return result.error;
    const { user, progress } = activateUserSession();
    set({ user, progress });
    return null;
  },

  login: async (username, password) => {
    const result = await loginUser(username, password);
    if (!result.ok) return result.error;
    const { user, progress } = activateUserSession();
    set({ user, progress });
    return null;
  },

  logout: () => {
    logoutUser();
    set({ user: null, progress: createEmptyProgress() });
  },

  setMode: (mode) => {
    if (!get().user) return;
    const progress = {
      ...get().progress,
      settings: { ...get().progress.settings, mode },
    };
    saveProgress(progress);
    set({ progress });
  },

  updateSettings: (partial) => {
    if (!get().user) return;
    const progress = {
      ...get().progress,
      settings: { ...get().progress.settings, ...partial },
    };
    saveProgress(progress);
    set({ progress });
  },

  applyGrade: (entryId, grade) => {
    if (!get().user) return;
    let progress = updateStreak(get().progress);
    const existing = progress.cards[entryId] ?? createNewCard(entryId);
    const wasNew = existing.state === 'new' || !existing.introducedAt;
    const updated = scheduleReview(existing, grade);
    progress = {
      ...progress,
      cards: { ...progress.cards, [entryId]: updated },
      daily: bumpDaily(progress, {
        reviewDelta: 1,
        newDelta: wasNew && grade !== 'again' && grade !== 'know' ? 1 : 0,
      }),
    };
    saveProgress(progress);
    set({ progress });
  },

  recordAnswer: (entryId, correct) => {
    if (!get().user) return;
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
    if (!get().user) return;
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
    if (!get().user) return;
    const progress = parseImport(json);
    saveProgress(progress);
    set({ progress });
  },
}));

export type { GradeInput as Grade };
