/**
 * Sync learning progress to a private GitHub repo via Contents API.
 * PAT stays in localStorage only — never committed.
 */
import type { AppProgress, CardProgress, DailyStats } from '../types/vocab';
import { createEmptyProgress } from './storage';

const PAT_KEY = 'wortklar-github-pat';
const REPO_KEY = 'wortklar-github-progress-repo';
const DEFAULT_REPO = 'vkhramov/wortklar-progress';
const API = 'https://api.github.com';

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing'; detail?: string }
  | { state: 'ok'; detail: string; at: string }
  | { state: 'error'; detail: string };

export function getProgressPat(): string {
  return localStorage.getItem(PAT_KEY)?.trim() ?? '';
}

export function setProgressPat(token: string): void {
  const t = token.trim();
  if (!t) localStorage.removeItem(PAT_KEY);
  else localStorage.setItem(PAT_KEY, t);
}

export function getProgressRepo(): string {
  return localStorage.getItem(REPO_KEY)?.trim() || DEFAULT_REPO;
}

export function setProgressRepo(repo: string): void {
  const r = repo.trim();
  if (!r || r === DEFAULT_REPO) localStorage.removeItem(REPO_KEY);
  else localStorage.setItem(REPO_KEY, r);
}

function progressPath(username: string): string {
  const safe = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
  return `users/${safe}.json`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

type RemoteFile = {
  progress: AppProgress;
  sha: string;
};

async function fetchRemote(
  token: string,
  repo: string,
  path: string,
): Promise<RemoteFile | null> {
  const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub GET ${res.status}: ${body.slice(0, 180)}`);
  }
  const data = (await res.json()) as { content?: string; encoding?: string; sha: string };
  if (!data.content) throw new Error('Empty GitHub file content');
  const bin = atob(data.content.replace(/\n/g, ''));
  const raw = new TextDecoder().decode(
    Uint8Array.from(bin, (c) => c.charCodeAt(0)),
  );
  const parsed = JSON.parse(raw) as AppProgress;
  return { progress: normalizeProgress(parsed), sha: data.sha };
}

function normalizeProgress(parsed: AppProgress): AppProgress {
  const base = createEmptyProgress();
  return {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...parsed.settings },
    cards: parsed.cards ?? {},
    daily: parsed.daily ?? [],
    updatedAt: parsed.updatedAt ?? parsed.createdAt ?? new Date().toISOString(),
  };
}

function stamp(progress: AppProgress): AppProgress {
  return { ...progress, updatedAt: new Date().toISOString() };
}

function cardTime(card: CardProgress): string {
  return card.lastReview ?? card.introducedAt ?? '';
}

function mergeDaily(a: DailyStats[], b: DailyStats[]): DailyStats[] {
  const map = new Map<string, DailyStats>();
  for (const row of [...a, ...b]) {
    const prev = map.get(row.date);
    if (!prev) {
      map.set(row.date, { ...row });
      continue;
    }
    map.set(row.date, {
      date: row.date,
      reviewsDone: Math.max(prev.reviewsDone, row.reviewsDone),
      newLearned: Math.max(prev.newLearned, row.newLearned),
      correct: Math.max(prev.correct, row.correct),
      incorrect: Math.max(prev.incorrect, row.incorrect),
    });
  }
  return [...map.values()].sort((x, y) => x.date.localeCompare(y.date)).slice(-120);
}

/** Merge local + remote: per-card newest activity wins; settings from newer blob. */
export function mergeProgress(local: AppProgress, remote: AppProgress): AppProgress {
  const localT = local.updatedAt ?? local.createdAt;
  const remoteT = remote.updatedAt ?? remote.createdAt;
  const newerMeta = localT >= remoteT ? local : remote;

  const cards: Record<string, CardProgress> = { ...remote.cards };
  for (const [id, localCard] of Object.entries(local.cards)) {
    const remoteCard = cards[id];
    if (!remoteCard) {
      cards[id] = localCard;
      continue;
    }
    cards[id] =
      cardTime(localCard) >= cardTime(remoteCard) ? localCard : remoteCard;
  }

  return stamp({
    ...newerMeta,
    cards,
    daily: mergeDaily(local.daily, remote.daily),
    streak: Math.max(local.streak, remote.streak),
    createdAt:
      local.createdAt <= remote.createdAt ? local.createdAt : remote.createdAt,
  });
}

export async function pullProgress(
  username: string,
  local: AppProgress,
): Promise<{ progress: AppProgress; changed: boolean }> {
  const token = getProgressPat();
  if (!token) return { progress: local, changed: false };
  const repo = getProgressRepo();
  const remote = await fetchRemote(token, repo, progressPath(username));
  if (!remote) return { progress: local, changed: false };
  const merged = mergeProgress(local, remote.progress);
  return { progress: merged, changed: true };
}

export async function pushProgress(
  username: string,
  progress: AppProgress,
): Promise<void> {
  const token = getProgressPat();
  if (!token) throw new Error('No GitHub token saved');
  const repo = getProgressRepo();
  const path = progressPath(username);
  const stamped = stamp(progress);

  let sha: string | undefined;
  try {
    const existing = await fetchRemote(token, repo, path);
    sha = existing?.sha;
  } catch {
    /* create new file */
  }

  const body = {
    message: `chore: sync progress for ${username}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(stamped, null, 2)))),
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${res.status}: ${text.slice(0, 200)}`);
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pending:
  | { username: string; progress: AppProgress }
  | null = null;

/** Debounced background push after local saves. */
export function scheduleProgressPush(
  username: string,
  progress: AppProgress,
  onDone?: (err: string | null, merged?: AppProgress) => void,
): void {
  if (!getProgressPat()) return;
  pending = { username, progress: stamp(progress) };
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const job = pending;
    pending = null;
    pushTimer = null;
    if (!job) return;
    try {
      // Pull+merge first to reduce overwrite races
      const { progress: merged } = await pullProgress(job.username, job.progress);
      await pushProgress(job.username, merged);
      onDone?.(null, merged);
    } catch (e) {
      onDone?.(e instanceof Error ? e.message : String(e));
    }
  }, 2500);
}
