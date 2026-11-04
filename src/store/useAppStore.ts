import { create } from 'zustand';
import type {
  AppProgress,
  DailyStats,
  LearningMode,
  VocabEntry,
} from '../types/vocab';
import type { Grade as SrsGrade } from '../lib/srs';
import { scheduleReview, createNewCard, resumeFromKnown } from '../lib/srs';
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
import {
  getProgressPat,
  pullProgress,
  pushProgress,
  scheduleProgressPush,
  type SyncStatus,
} from '../lib/progressSync';

type GradeInput = SrsGrade;

interface AppState {
  ready: boolean;
  vocabLoaded: boolean;
  vocabulary: VocabEntry[];
  progress: AppProgress;
  user: AuthUser | null;
  syncStatus: SyncStatus;
  init: () => Promise<void>;
  register: (username: string, password: string) => Promise<string | null>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  setMode: (mode: LearningMode) => void;
  updateSettings: (partial: Partial<AppProgress['settings']>) => void;
  applyGrade: (entryId: string, grade: GradeInput) => void;
  resumeLearning: (entryId: string) => void;
  recordAnswer: (entryId: string, correct: boolean) => void;
  resetProgress: () => void;
  exportData: () => string;
  importData: (json: string) => void;
  syncPull: () => Promise<string | null>;
  syncPush: () => Promise<string | null>;
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

function stamp(progress: AppProgress): AppProgress {
  return { ...progress, updatedAt: new Date().toISOString() };
}

function persist(
  progress: AppProgress,
  set: (partial: Partial<AppState>) => void,
  username?: string,
) {
  const next = stamp(progress);
  saveProgress(next);
  set({ progress: next });
  if (username && getProgressPat()) {
    scheduleProgressPush(username, next, (err, merged) => {
      if (err) {
        set({
          syncStatus: {
            state: 'error',
            detail: err,
          },
        });
        return;
      }
      if (merged) {
        saveProgress(merged);
        set({
          progress: merged,
          syncStatus: {
            state: 'ok',
            detail: 'Synced to GitHub',
            at: new Date().toISOString(),
          },
        });
      }
    });
  }
}

async function tryPullIntoSession(
  user: AuthUser,
  local: AppProgress,
  set: (partial: Partial<AppState>) => void,
): Promise<AppProgress> {
  if (!getProgressPat()) return local;
  set({ syncStatus: { state: 'syncing', detail: 'Pulling…' } });
  try {
    const { progress, changed } = await pullProgress(user.username, local);
    if (changed) {
      saveProgress(progress);
      set({
        progress,
        syncStatus: {
          state: 'ok',
          detail: 'Merged from GitHub',
          at: new Date().toISOString(),
        },
      });
      return progress;
    }
    set({
      syncStatus: {
        state: 'ok',
        detail: 'Up to date',
        at: new Date().toISOString(),
      },
    });
    return local;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    set({ syncStatus: { state: 'error', detail } });
    return local;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  vocabLoaded: false,
  vocabulary: [],
  progress: createEmptyProgress(),
  user: null,
  syncStatus: { state: 'idle' },

  init: async () => {
    const existing = getCurrentUser();
    if (existing) {
      migrateLegacyProgressIfNeeded(existing.id);
      const local = loadProgress();
      set({ user: existing, progress: local, ready: true });
      void tryPullIntoSession(existing, local, set);
    } else {
      set({ user: null, progress: createEmptyProgress(), ready: true });
    }
    try {
      const base = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${base}data/vocabulary.json`);
      if (!res.ok) throw new Error(String(res.status));
      const vocabulary = (await res.json()) as VocabEntry[];
      set({ vocabulary, vocabLoaded: true });
    } catch {
      set({ vocabLoaded: true });
    }
  },

  register: async (username, password) => {
    const result = await registerUser(username, password);
    if (!result.ok) return result.error;
    const { user, progress } = activateUserSession();
    set({ user, progress });
    void tryPullIntoSession(user, progress, set);
    return null;
  },

  login: async (username, password) => {
    const result = await loginUser(username, password);
    if (!result.ok) return result.error;
    const { user, progress } = activateUserSession();
    set({ user, progress });
    void tryPullIntoSession(user, progress, set);
    return null;
  },

  logout: () => {
    logoutUser();
    set({ user: null, progress: createEmptyProgress(), syncStatus: { state: 'idle' } });
  },

  setMode: (mode) => {
    const user = get().user;
    if (!user) return;
    persist(
      {
        ...get().progress,
        settings: { ...get().progress.settings, mode },
      },
      set,
      user.username,
    );
  },

  updateSettings: (partial) => {
    const user = get().user;
    if (!user) return;
    persist(
      {
        ...get().progress,
        settings: { ...get().progress.settings, ...partial },
      },
      set,
      user.username,
    );
  },

  applyGrade: (entryId, grade) => {
    const user = get().user;
    if (!user) return;
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
    persist(progress, set, user.username);
  },

  resumeLearning: (entryId) => {
    const user = get().user;
    if (!user) return;
    const existing = get().progress.cards[entryId];
    if (!existing) return;
    const updated = resumeFromKnown(existing);
    if (updated === existing) return;
    persist(
      {
        ...get().progress,
        cards: { ...get().progress.cards, [entryId]: updated },
      },
      set,
      user.username,
    );
  },

  recordAnswer: (entryId, correct) => {
    const user = get().user;
    if (!user) return;
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
    persist(progress, set, user.username);
  },

  resetProgress: () => {
    const user = get().user;
    if (!user) return;
    const { settings } = get().progress;
    const progress = {
      ...createEmptyProgress(),
      settings,
    };
    persist(progress, set, user.username);
  },

  exportData: () => exportProgress(get().progress),

  importData: (json) => {
    const user = get().user;
    if (!user) return;
    const progress = parseImport(json);
    persist(progress, set, user.username);
  },

  syncPull: async () => {
    const user = get().user;
    if (!user) return 'Not signed in';
    if (!getProgressPat()) return 'Save a GitHub PAT in Settings first';
    set({ syncStatus: { state: 'syncing', detail: 'Pulling…' } });
    try {
      const { progress } = await pullProgress(user.username, get().progress);
      saveProgress(progress);
      set({
        progress,
        syncStatus: {
          state: 'ok',
          detail: 'Pulled from GitHub',
          at: new Date().toISOString(),
        },
      });
      return null;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      set({ syncStatus: { state: 'error', detail } });
      return detail;
    }
  },

  syncPush: async () => {
    const user = get().user;
    if (!user) return 'Not signed in';
    if (!getProgressPat()) return 'Save a GitHub PAT in Settings first';
    set({ syncStatus: { state: 'syncing', detail: 'Pushing…' } });
    try {
      const { progress: merged } = await pullProgress(user.username, get().progress);
      await pushProgress(user.username, merged);
      saveProgress(merged);
      set({
        progress: merged,
        syncStatus: {
          state: 'ok',
          detail: 'Pushed to GitHub',
          at: new Date().toISOString(),
        },
      });
      return null;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      set({ syncStatus: { state: 'error', detail } });
      return detail;
    }
  },
}));

export type { GradeInput as Grade };
