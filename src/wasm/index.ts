import init, { initSync, type SyncInitInput } from "./pkg/strategy_core.js";

let initPromise: Promise<unknown> | null = null;

export function initCore(): Promise<unknown> {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
}

export function initCoreSync(bytes: SyncInitInput): void {
  initSync({ module: bytes });
  initPromise = Promise.resolve();
}

export {
  fuzzyMatchCore,
  fuzzySearchBatch,
  matchStateToPacket,
  packetToMatchFields,
} from "./pkg/strategy_core.js";
