import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";

import { readLegacyMatchPackets } from "$lib/features/legacy-migration";

Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: fakeIndexedDb });

function complete(request: IDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function seed(entries: Array<[string, unknown]>): Promise<void> {
  const request = indexedDB.open("keyval-store", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("keyval");
  await complete(request);
  const database = request.result;
  const transaction = database.transaction("keyval", "readwrite");
  const store = transaction.objectStore("keyval");
  for (const [key, value] of entries) store.put(value, key);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

beforeEach(async () => {
  await complete(indexedDB.deleteDatabase("keyval-store"));
});

describe("legacy IndexedDB migration", () => {
  it("prefers the consolidated appData packet list", async () => {
    const packets = [["Match 1"], ["Match 2"]];
    await seed([["appData", packets], ["matchIds", ["ignored"]], ["ignored", ["Old"]]]);
    expect(await readLegacyMatchPackets()).toEqual(packets);
  });

  it("restores the older matchIds and per-match layout", async () => {
    await seed([["matchIds", ["one", "missing", "two"]], ["one", ["Match 1"]], ["two", ["Match 2"]]]);
    expect(await readLegacyMatchPackets()).toEqual([["Match 1"], ["Match 2"]]);
  });
});
