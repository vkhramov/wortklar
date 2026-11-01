import type { AppProgress, UserSettings } from '../types/vocab';

const STORAGE_KEY = 'wortklar-progress-v1';

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
  return {
    cards: {},
    streak: 0,
    lastStudyDate: null,
    daily: [],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

export function loadProgress(): AppProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProgress();
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

export function saveProgress(progress: AppProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
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
