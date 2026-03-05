import { get, getMany, set, clear, entries, del } from "idb-keyval";

/**
 * Retrieves a value from IndexedDB by key.
 *
 * @param key - The key to retrieve the value for.
 * @param handler - Optional error handler function.
 * @returns The value associated with the key, or undefined if not found or an error occurs.
 */
export async function GET<T = unknown>(
  key: string,
  handler?: (err: Error) => void,
): Promise<T | undefined> {
  try {
    return await get<T>(key);
  } catch (err) {
    if (handler) {
      handler(err as Error);
      return undefined;
    } else {
      console.error("Could not load data from IndexedDB:", err);
      return undefined;
    }
  }
}

/**
 * Retrieves multiple values from IndexedDB by their keys.
 *
 * @param keys - Array of keys to retrieve values for.
 * @param handler - Optional error handler function.
 * @returns Array of values associated with the keys, or undefined if an error occurs.
 */
export async function GETMANY<T = unknown>(
  keys: Array<string>,
  handler?: (err: Error) => void,
): Promise<T[] | undefined> {
  try {
    return await getMany<T>(keys);
  } catch (err) {
    if (handler) {
      handler(err as Error);
      return undefined;
    } else {
      console.error("Could not load data from IndexedDB:", err);
      return undefined;
    }
  }
}

/**
 * Stores a value in IndexedDB with the specified key.
 *
 * @param key - The key to store the value under.
 * @param value - The value to store.
 * @param handler - Optional error handler function.
 */
export async function SET<T = unknown>(
  key: string,
  value: T,
  handler?: (err: Error) => void,
): Promise<void> {
  try {
    await set(key, value);
  } catch (err) {
    if (handler) {
      handler(err as Error);
    } else {
      console.error("Could not set data in IndexedDB:", err);
    }
  }
}

/**
 * Deletes a value from IndexedDB by key.
 *
 * @param key - The key of the value to delete.
 */
export async function DEL(key: string): Promise<void> {
  try {
    await del(key);
  } catch (err) {
    console.error("Could not delete data from IndexedDB:", err);
  }
}

/**
 * Clears all data from IndexedDB.
 */
export async function CLEAR(): Promise<void> {
  try {
    await clear();
  } catch (err) {
    console.error("Could not clear IndexedDB:", err);
  }
}

/**
 * Retrieves all key-value pairs from IndexedDB.
 *
 * @param handler - Optional error handler function.
 * @returns Array of key-value pairs, or undefined if an error occurs.
 */
export async function ENTRIES(
  handler?: (err: Error) => void,
): Promise<Array<[IDBValidKey, unknown]> | undefined> {
  try {
    return await entries();
  } catch (err) {
    if (handler) {
      handler(err as Error);
      return undefined;
    } else {
      console.error("Could not load entries from IndexedDB:", err);
      return undefined;
    }
  }
}

interface CachedStatboticsData {
  data: any;
  timestamp: number;
  matchKey: string;
}

/**
 * Saves Statbotics data to IndexedDB cache.
 *
 * @param matchKey - The TBA match key
 * @param data - The Statbotics data to cache
 * @returns A promise that resolves when data is saved
 */
export async function CACHE_STATBOTICS(
  matchKey: string,
  data: any,
): Promise<void> {
  const cacheKey = `statbotics_${matchKey}`;
  const cached: CachedStatboticsData = {
    data,
    timestamp: Date.now(),
    matchKey,
  };
  await SET(cacheKey, cached, (err) => {
    console.error(`Failed to cache Statbotics data for ${matchKey}:`, err);
  });
}

/**
 * Retrieves cached Statbotics data from IndexedDB.
 *
 * @param matchKey - The TBA match key
 * @param maxAgeMs - Maximum age of cached data in milliseconds (default: 24 hours)
 * @returns The cached data if valid, or undefined if not found or expired
 */
export async function GET_CACHED_STATBOTICS(
  matchKey: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): Promise<any | undefined> {
  const cacheKey = `statbotics_${matchKey}`;
  const cached = await GET<CachedStatboticsData>(cacheKey, (err) => {
    console.error(
      `Failed to load cached Statbotics data for ${matchKey}:`,
      err,
    );
  });

  if (!cached) {
    return undefined;
  }

  const age = Date.now() - cached.timestamp;
  if (age > maxAgeMs) {
    console.log(
      `[Cache] Statbotics data for ${matchKey} expired (${Math.round(age / 1000 / 60)} minutes old)`,
    );
    await DEL(cacheKey);
    return undefined;
  }

  console.log(
    `[Cache] Using cached Statbotics data for ${matchKey} (${Math.round(age / 1000 / 60)} minutes old)`,
  );
  return cached.data;
}

/**
 * Clears all cached Statbotics data from IndexedDB.
 *
 * @returns A promise that resolves when all Statbotics caches are cleared
 */
export async function CLEAR_STATBOTICS_CACHE(): Promise<void> {
  try {
    const allEntries = await entries();
    const statboticsKeys = allEntries
      .map(([key]) => key)
      .filter((key) => String(key).startsWith("statbotics_"));

    for (const key of statboticsKeys) {
      await del(key);
    }
    console.log(
      `[Cache] Cleared ${statboticsKeys.length} Statbotics cache entries`,
    );
  } catch (err) {
    console.error("Failed to clear Statbotics cache:", err);
  }
}
