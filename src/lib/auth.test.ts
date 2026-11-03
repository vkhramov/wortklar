import {
  getCurrentUser,
  getSessionUserId,
  loginUser,
  logoutUser,
  migrateLegacyProgressIfNeeded,
  progressKeyForUser,
  registerUser,
  LEGACY_PROGRESS_KEY,
} from './auth';

const mem = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
  clear: () => mem.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

async function run() {
  mem.clear();
  logoutUser();

  const created = await registerUser('Viktor', 'secret');
  console.assert(created.ok, 'register should succeed');
  if (!created.ok) throw new Error(created.error);
  console.assert(getSessionUserId() === created.user.id);
  console.assert(getCurrentUser()?.username === 'viktor');

  const dup = await registerUser('viktor', 'other');
  console.assert(!dup.ok, 'duplicate username rejected');

  logoutUser();
  console.assert(getSessionUserId() === null);

  const bad = await loginUser('viktor', 'wrong');
  console.assert(!bad.ok);

  const ok = await loginUser('Viktor', 'secret');
  console.assert(ok.ok);

  // Fresh browser: Log in bootstraps a local account for the same username.
  mem.clear();
  logoutUser();
  const boot = await loginUser('viktor', 'secret');
  console.assert(boot.ok, 'login on empty device should create local account');
  if (!boot.ok) throw new Error(boot.error);
  console.assert(getCurrentUser()?.username === 'viktor');

  mem.set(LEGACY_PROGRESS_KEY, JSON.stringify({ cards: { x: 1 }, settings: {} }));
  const userId = getSessionUserId()!;
  mem.delete(progressKeyForUser(userId));
  console.assert(migrateLegacyProgressIfNeeded(userId) === true);
  console.assert(Boolean(mem.get(progressKeyForUser(userId))));
  console.assert(!mem.has(LEGACY_PROGRESS_KEY));
  console.assert(migrateLegacyProgressIfNeeded(userId) === false);

  console.log('auth.test.ts OK');
}

void run();
