import { get, getMany, set, clear, entries, del } from "idb-keyval";

// IndexedDB wrapper functions with error handling for persistent storage

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

export async function DEL(key: string): Promise<void> {
  try {
    await del(key);
  } catch (err) {
    console.error("Could not delete data from IndexedDB:", err);
  }
}

export async function CLEAR(): Promise<void> {
  try {
    await clear();
  } catch (err) {
    console.error("Could not clear IndexedDB:", err);
  }
}

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
