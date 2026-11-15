/**
 * One small cache for every request, so a repeat visit costs nothing and the
 * demo survives a bad venue network. Memory first, localStorage second.
 */

const PREFIX = "kasa:";
const memory = new Map<string, unknown>();

type Entry<T> = { value: T; expires: number };

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const fullKey = PREFIX + key;

  if (memory.has(fullKey)) return memory.get(fullKey) as T;

  try {
    const raw = localStorage.getItem(fullKey);
    if (raw) {
      const entry = JSON.parse(raw) as Entry<T>;
      if (entry.expires > Date.now()) {
        memory.set(fullKey, entry.value);
        return entry.value;
      }
      localStorage.removeItem(fullKey);
    }
  } catch {
    // Storage can be full or blocked; the app still works without it.
  }

  const value = await load();
  memory.set(fullKey, value);
  try {
    const entry: Entry<T> = { value, expires: Date.now() + ttlMs };
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // Ignore quota errors.
  }
  return value;
}

/** Used by the demo pack and tests. */
export function clearCache(): void {
  memory.clear();
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Ignore.
  }
}

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
