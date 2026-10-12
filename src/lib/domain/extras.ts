import type { JsonObject, MatchPacket } from "$lib/native/types";

import { isObject } from "./json";

export type MatchLevel = "practice" | "qual" | "playoff" | "final";
export const MATCH_LEVELS: readonly MatchLevel[] = ["practice", "qual", "playoff", "final"];

/** The schedule identity of a Synced Match plus the last schedule team lists seen for it. */
export interface SyncMarker {
  eventKey: string;
  level: MatchLevel;
  number: number;
  red: string[];
  blue: string[];
}
export interface BenchTeams { red?: string; blue?: string }
export interface MatchExtras {
  /** Ids of the ticked Checklist Items. */
  ticks?: string[];
  sync?: SyncMarker;
  bench?: BenchTeams;
}
export type ExtrasPatch = { [Key in keyof MatchExtras]?: MatchExtras[Key] | undefined };

// the official app and both runtimes keep unknown metadata keys, so all extras live under this one
const EXTRAS_KEY = "orbit";

function strings(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? [...value] : undefined;
}
function syncMarker(value: unknown): SyncMarker | undefined {
  if (!isObject(value)) return undefined;
  const red = strings(value.red);
  const blue = strings(value.blue);
  const { eventKey, level, number } = value;
  if (typeof eventKey !== "string" || !MATCH_LEVELS.includes(level as MatchLevel) || typeof number !== "number" || !Number.isFinite(number) || !red || !blue) return undefined;
  return { eventKey, level: level as MatchLevel, number, red, blue };
}
function benchTeams(value: unknown): BenchTeams | undefined {
  if (!isObject(value)) return undefined;
  const bench: BenchTeams = {};
  if (typeof value.red === "string" && value.red) bench.red = value.red;
  if (typeof value.blue === "string" && value.blue) bench.blue = value.blue;
  return bench.red || bench.blue ? bench : undefined;
}

export function readExtras(packet: MatchPacket): MatchExtras {
  const metadata = packet[12];
  const stored = isObject(metadata) && isObject(metadata[EXTRAS_KEY]) ? metadata[EXTRAS_KEY] : {};
  const extras: MatchExtras = {};
  const ticks = strings(stored.ticks);
  const sync = syncMarker(stored.sync);
  const bench = benchTeams(stored.bench);
  if (ticks) extras.ticks = ticks;
  if (sync) extras.sync = sync;
  if (bench) extras.bench = bench;
  return extras;
}

/** Returns a copy of the packet with the patched extras; an undefined value removes that extra. */
export function withExtras(packet: MatchPacket, patch: ExtrasPatch): MatchPacket {
  const copy = structuredClone(packet);
  const metadata: Record<string, unknown> = isObject(copy[12]) ? { ...copy[12] } : {};
  const extras: Record<string, unknown> = isObject(metadata[EXTRAS_KEY]) ? { ...metadata[EXTRAS_KEY] } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete extras[key];
    else extras[key] = structuredClone(value);
  }
  if (Object.keys(extras).length) metadata[EXTRAS_KEY] = extras;
  else delete metadata[EXTRAS_KEY];
  copy[12] = Object.keys(metadata).length ? (metadata as JsonObject) : null;
  return copy;
}

/** A What-if Match is never touched by Schedule Sync: it keeps its TBA keys but carries no sync marker. */
export function toWhatIfMatch(packet: MatchPacket): MatchPacket {
  return withExtras(packet, { sync: undefined });
}

