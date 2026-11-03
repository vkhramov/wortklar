import type { AppProgress, UserSettings } from '../types/vocab';
import {
  getSessionUserId,
  LEGACY_PROGRESS_KEY,
  progressKeyForUser,
} from './auth';

export const DEFAULT_SETTINGS: UserSettings = {
  mode: 'en-de',
  dailyGoal: 30,
  sessionSize: 30,
  newPerSession: 18,
  topics: [],
  levels: ['A1', 'A2', 'B1', 'B2'],
  showUmlautButtons: true,
};

export function createEmptyProgress(): AppProgress {
  const now = new Date().toISOString();
  return {
    cards: {},
    streak: 0,
    lastStudyDate: null,
    daily: [],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function activeProgressKey(): string | null {
  const userId = getSessionUserId();
  if (!userId) return null;
  return progressKeyForUser(userId);
}

function readProgressJson(raw: string | null): AppProgress {
  if (!raw) return createEmptyProgress();
  try {
    const parsed = JSON.parse(raw) as AppProgress;
    return {
      ...createEmptyProgress(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return createEmptyProgress();
  }
}

export function loadProgress(): AppProgress {
  const key = activeProgressKey();
  if (!key) return createEmptyProgress();
  return readProgressJson(localStorage.getItem(key));
}

export function saveProgress(progress: AppProgress): void {
  const key = activeProgressKey();
  if (!key) return;
  const stamped: AppProgress = {
    ...progress,
    updatedAt: progress.updatedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(stamped));
}

export function exportProgress(progress: AppProgress): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(json: string): AppProgress {
  const parsed = JSON.parse(json) as AppProgress;
  if (!parsed || typeof parsed !== 'object' || !parsed.settings) {
    throw new Error('Invalid backup file');
  }
  return {
    ...createEmptyProgress(),
    ...parsed,
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
  };
}

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function updateStreak(progress: AppProgress, now: Date = new Date()): AppProgress {
  const today = todayKey(now);
  if (progress.lastStudyDate === today) return progress;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = todayKey(yesterday);

  const streak =
    progress.lastStudyDate === yKey ? progress.streak + 1 : 1;

  return {
    ...progress,
    streak,
    lastStudyDate: today,
  };
}

/** Peek at legacy anonymous progress (for migration messaging). */
export function hasLegacyProgress(): boolean {
  return Boolean(localStorage.getItem(LEGACY_PROGRESS_KEY));
}
