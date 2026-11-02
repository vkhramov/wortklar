import wordImages from '../data/word-images.json';

/** jsDelivr CDN for the separate wortklar-images repo (pinned commit for cache). */
const DEFAULT_BASE =
  'https://cdn.jsdelivr.net/gh/vkhramov/wortklar-images@ff9f942/';

const MAP = wordImages as Record<string, string>;

export function wordImageFile(entryId: string): string | undefined {
  return MAP[entryId];
}

export function wordImageUrl(entryId: string): string | undefined {
  const file = wordImageFile(entryId);
  if (!file) return undefined;
  const base =
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_IMAGE_BASE_URL) ||
    DEFAULT_BASE;
  return `${String(base).replace(/\/?$/, '/')}${file}`;
}

export function hasWordImage(entryId: string): boolean {
  return Boolean(MAP[entryId]);
}
