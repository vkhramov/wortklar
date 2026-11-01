/**
 * Simple local accounts for GitHub Pages (no server / no email).
 * Credentials and per-user progress stay in this browser's localStorage.
 */

export interface AuthUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface UserRegistry {
  version: 1;
  users: AuthUser[];
}

const USERS_KEY = 'wortklar-users-v1';
const SESSION_KEY = 'wortklar-session-v1';
/** Pre-account progress key — migrated into the first created/logged-in user. */
export const LEGACY_PROGRESS_KEY = 'wortklar-progress-v1';

function loadRegistry(): UserRegistry {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return { version: 1, users: [] };
    const parsed = JSON.parse(raw) as UserRegistry;
    if (!parsed?.users || !Array.isArray(parsed.users)) {
      return { version: 1, users: [] };
    }
    return { version: 1, users: parsed.users };
  } catch {
    return { version: 1, users: [] };
  }
}

function saveRegistry(registry: UserRegistry): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(registry));
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function progressKeyForUser(userId: string): string {
  return `wortklar-progress-v1:${userId}`;
}

export function getSessionUserId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    return parsed.userId ?? null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  const id = getSessionUserId();
  if (!id) return null;
  return loadRegistry().users.find((u) => u.id === id) ?? null;
}

export function setSession(userId: string | null): void {
  if (!userId) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
}

export function listUsernames(): string[] {
  return loadRegistry().users.map((u) => u.username).sort((a, b) => a.localeCompare(b));
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export async function registerUser(
  usernameRaw: string,
  password: string,
): Promise<AuthResult> {
  const username = normalizeUsername(usernameRaw);
  if (username.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }
  if (!/^[a-z0-9._-]+$/i.test(username)) {
    return {
      ok: false,
      error: 'Use letters, numbers, dots, underscores, or hyphens.',
    };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const registry = loadRegistry();
  if (registry.users.some((u) => u.username === username)) {
    return { ok: false, error: 'That username is already taken on this device.' };
  }

  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const user: AuthUser = {
    id: randomId(),
    username,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };
  registry.users.push(user);
  saveRegistry(registry);
  setSession(user.id);
  return { ok: true, user };
}

export async function loginUser(
  usernameRaw: string,
  password: string,
): Promise<AuthResult> {
  const username = normalizeUsername(usernameRaw);
  const registry = loadRegistry();
  const user = registry.users.find((u) => u.username === username);
  if (!user) {
    return { ok: false, error: 'Unknown username on this device.' };
  }
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) {
    return { ok: false, error: 'Incorrect password.' };
  }
  setSession(user.id);
  return { ok: true, user };
}

export function logoutUser(): void {
  setSession(null);
}

/**
 * If legacy anonymous progress exists and this user has none yet, claim it.
 * Returns true when migration happened.
 */
export function migrateLegacyProgressIfNeeded(userId: string): boolean {
  const userKey = progressKeyForUser(userId);
  if (localStorage.getItem(userKey)) return false;
  const legacy = localStorage.getItem(LEGACY_PROGRESS_KEY);
  if (!legacy) return false;
  localStorage.setItem(userKey, legacy);
  localStorage.removeItem(LEGACY_PROGRESS_KEY);
  return true;
}
