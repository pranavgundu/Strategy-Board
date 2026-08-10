import type { MatchPacket } from "$lib/native/types";

const LEGACY_DATABASE = "keyval-store";
const LEGACY_STORE = "keyval";

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not read legacy data"));
  });
}

function openLegacyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open legacy data"));
  });
}

function readLegacyValue(database: IDBDatabase, key: string): Promise<unknown> {
  const transaction = database.transaction(LEGACY_STORE, "readonly");
  return requestValue(transaction.objectStore(LEGACY_STORE).get(key));
}

/**
 * Reads the idb-keyval default store used by the previous app. It never deletes
 * or mutates the old database, so a failed native import remains recoverable.
 */
export async function readLegacyMatchPackets(): Promise<MatchPacket[]> {
  if (typeof indexedDB === "undefined") return [];

  const database = await openLegacyDatabase();
  try {
    if (!database.objectStoreNames.contains(LEGACY_STORE)) return [];
    const consolidated = await readLegacyValue(database, "appData");
    if (Array.isArray(consolidated)) return consolidated.filter(Array.isArray) as MatchPacket[];

    const ids = await readLegacyValue(database, "matchIds");
    if (!Array.isArray(ids)) return [];
    const packets = await Promise.all(ids.filter((id): id is string => typeof id === "string").map((id) => readLegacyValue(database, id)));
    return packets.filter(Array.isArray) as MatchPacket[];
  } finally {
    database.close();
  }
}
