import { native } from "$lib/native/api";
import type { Alliance, CreateMatchInput, MatchPacket, StrategyMatch } from "$lib/native/types";
import { readLegacyMatchPackets } from "$lib/features/legacy-migration";

import { toast } from "./toast.svelte";

export type Screen = "home" | "whiteboard";

let screen = $state<Screen>("home");
let packets = $state<MatchPacket[]>([]);
let activeMatchId = $state<string | null>(null);
let loading = $state(true);
let saving = $state(false);
let initialized = false;
let initPromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let pendingWrites = 0;
const LEGACY_MIGRATION_KEY = "legacyIndexedDbMigrationV1";

export interface MatchInfoUpdate {
  matchName: string;
  redOne: string;
  redTwo: string;
  redThree: string;
  blueOne: string;
  blueTwo: string;
  blueThree: string;
}

function project(packet: MatchPacket): StrategyMatch {
  return {
    id: packet[7],
    matchName: packet[0],
    redOne: packet[1],
    redTwo: packet[2],
    redThree: packet[3],
    blueOne: packet[4],
    blueTwo: packet[5],
    blueThree: packet[6],
    tbaMatchKey: packet[10] ?? null,
    red: [packet[1], packet[2], packet[3]],
    blue: [packet[4], packet[5], packet[6]],
    packet,
    ...(packet[9] ? { tbaEventKey: packet[9] } : {}),
    ...(packet[11] !== null && packet[11] !== undefined ? { tbaYear: packet[11] } : {}),
    ...(packet[12] ? { fieldMetadata: packet[12] } : {}),
  };
}

function asAlliance(teams: readonly string[]): Alliance {
  if (teams.length !== 3) throw new Error("A match requires exactly three teams per alliance.");
  return [teams[0] ?? "", teams[1] ?? "", teams[2] ?? ""];
}

function setPackets(next: MatchPacket[]): void {
  packets = next.map((packet) => structuredClone(packet));
}

function replaceInMemory(packet: MatchPacket): void {
  const index = packets.findIndex((candidate) => candidate[7] === packet[7]);
  if (index === -1) throw new Error("Cannot update a match that is not loaded.");
  const next = [...packets];
  next[index] = structuredClone(packet);
  packets = next;
}

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  pendingWrites += 1;
  saving = true;
  const task = writeQueue.then(operation);
  writeQueue = task.then(() => undefined, () => undefined);
  return task.finally(() => {
    pendingWrites -= 1;
    saving = pendingWrites > 0;
  });
}

async function createMatch(input: CreateMatchInput): Promise<string>;
async function createMatch(matchName: string, red: readonly string[], blue: readonly string[]): Promise<string>;
async function createMatch(inputOrName: CreateMatchInput | string, red?: readonly string[], blue?: readonly string[]): Promise<string> {
  const input: CreateMatchInput = typeof inputOrName === "string"
    ? { matchName: inputOrName, redTeams: asAlliance(red ?? []), blueTeams: asAlliance(blue ?? []) }
    : inputOrName;
  return queueWrite(async () => {
    const packet = await native.matches.createPacket(input);
    const id = await native.model.addPacket(packet);
    packets = [...packets, structuredClone(packet)];
    return id;
  });
}

/**
 * Persistent match state. Canvas code should update its in-memory scene freely
 * and call commitPacket only at a completed edit boundary (pointer-up/debounce).
 */
export const app = {
  get screen(): Screen { return screen; },
  get matches(): StrategyMatch[] { return packets.map(project); },
  get activeMatch(): StrategyMatch | null {
    const packet = activeMatchId === null ? undefined : packets.find((item) => item[7] === activeMatchId);
    return packet ? project(packet) : null;
  },
  get activeMatchId(): string | null { return activeMatchId; },
  get loading(): boolean { return loading; },
  get saving(): boolean { return saving; },

  init(): Promise<void> {
    if (initialized) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = (async () => {
      loading = true;
      try {
        let loaded = await native.model.loadPackets();
        const migrationComplete = await native.storage.get(LEGACY_MIGRATION_KEY).catch(() => null) === true;
        if (!migrationComplete) {
          if (loaded.length === 0) {
            const legacy = await readLegacyMatchPackets();
            const normalized = (await Promise.allSettled(legacy.map((packet) => native.matches.normalizePacket(packet))))
              .filter((result): result is PromiseFulfilledResult<MatchPacket> => result.status === "fulfilled")
              .map((result) => result.value);
            if (normalized.length > 0) {
              await native.model.addPackets(normalized);
              loaded = await native.model.loadPackets();
              toast.show(`Migrated ${normalized.length} match${normalized.length === 1 ? "" : "es"} from the previous Strategy Board install.`, "success");
            }
          }
          await native.storage.set(LEGACY_MIGRATION_KEY, true);
        }
        setPackets(loaded);
        initialized = true;
      } catch (error) {
        console.error("Failed to load Strategy Board data", error);
        toast.show("Could not load saved matches. Your existing data was not changed.", "error");
      } finally {
        loading = false;
        initPromise = null;
      }
    })();
    return initPromise;
  },

  openMatch(id: string): boolean {
    if (!packets.some((packet) => packet[7] === id)) return false;
    activeMatchId = id;
    screen = "whiteboard";
    return true;
  },

  closeMatch(): void {
    activeMatchId = null;
    screen = "home";
  },

  createMatch,

  /** Compatibility convenience for basic create dialogs. */
  createBasicMatch(matchName: string, red: readonly string[], blue: readonly string[]): Promise<string> {
    return createMatch(matchName, red, blue);
  },

  async duplicateMatch(id: string): Promise<string> {
    const source = packets.find((packet) => packet[7] === id);
    if (!source) throw new Error("Cannot duplicate a match that is not loaded.");

    return queueWrite(async () => {
      // Ask native code for an ID, then retain the source's completed board state.
      const fresh = await native.matches.createPacket({
        matchName: `Copy of ${source[0]}`,
        redTeams: [source[1], source[2], source[3]],
        blueTeams: [source[4], source[5], source[6]],
        ...(source[9] ? { tbaEventKey: source[9] } : {}),
        ...(source[10] ? { tbaMatchKey: source[10] } : {}),
        ...(source[11] !== null && source[11] !== undefined ? { tbaYear: source[11] } : {}),
      });
      const copy = structuredClone(source);
      copy[0] = fresh[0];
      copy[7] = fresh[7];
      const newId = await native.model.addPacket(copy);
      packets = [...packets, copy];
      return newId;
    });
  },

  /** Persist one fully composed packet atomically after a form or canvas edit. */
  async commitPacket(packet: MatchPacket): Promise<void> {
    await queueWrite(async () => {
      await native.model.replacePacket(packet);
      replaceInMemory(packet);
    });
  },

  async updateMatch(id: string, update: MatchInfoUpdate): Promise<void> {
    const source = packets.find((packet) => packet[7] === id);
    if (!source) throw new Error("Cannot update a match that is not loaded.");
    const next = structuredClone(source);
    next[0] = update.matchName;
    next[1] = update.redOne;
    next[2] = update.redTwo;
    next[3] = update.redThree;
    next[4] = update.blueOne;
    next[5] = update.blueTwo;
    next[6] = update.blueThree;
    await this.commitPacket(next);
  },

  /** Import many validated packets in one native transaction, not one IPC call per match. */
  async importPackets(imported: MatchPacket[]): Promise<string[]> {
    if (imported.length === 0) return [];
    return queueWrite(async () => {
      const ids = await native.model.addPackets(imported);
      setPackets(await native.model.loadPackets());
      return ids;
    });
  },

  async deleteMatch(id: string): Promise<void> {
    if (!packets.some((packet) => packet[7] === id)) return;
    await queueWrite(async () => {
      await native.model.deleteMatch(id);
      packets = packets.filter((packet) => packet[7] !== id);
      if (activeMatchId === id) this.closeMatch();
    });
  },

  async clearAll(): Promise<void> {
    await queueWrite(async () => {
      await native.model.clearMatches();
      packets = [];
      this.closeMatch();
    });
  },
};
