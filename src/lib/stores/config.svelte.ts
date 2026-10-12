import { emptyBoardConfig, readBoardConfig, type BoardConfig } from "$lib/domain";
import { native } from "$lib/native/api";
import type { JsonValue } from "$lib/native/types";

import { toast } from "./toast.svelte";

const STORAGE_KEY = "boardConfig";

let current = $state.raw<BoardConfig>(emptyBoardConfig());
let loading: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();

export const boardConfig = {
  get current(): BoardConfig { return current; },

  init(): Promise<void> {
    loading ??= native.storage.get(STORAGE_KEY).then(
      (stored) => { current = readBoardConfig(stored); },
      (error: unknown) => {
        console.error("Failed to load the Board Config", error);
        toast.show("Could not load this device's settings.", "error");
      },
    );
    return loading;
  },

  update(next: BoardConfig): Promise<void> {
    current = next;
    writes = writes
      .then(() => native.storage.set(STORAGE_KEY, next as unknown as JsonValue))
      .catch((error: unknown) => {
        console.error("Failed to save the Board Config", error);
        toast.show("Could not save that setting on this device.", "error");
      });
    return writes;
  },
};
