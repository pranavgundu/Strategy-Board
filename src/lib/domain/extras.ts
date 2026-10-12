import type { JsonObject, MatchPacket } from "$lib/native/types";

import { isObject } from "./json";
import { MATCH_LEVELS, type MatchLevel, type ScheduleIdentity, type ScheduleSource } from "./schedule";

// red and blue are the lists the schedule last gave - sync moves teams only when those change so hand edits stay
export interface SyncMarker extends ScheduleIdentity {
  red: string[];
  blue: string[];
  // nexus and tba order playoff teams differently - a reorder from the other source is not a team change
  source?: ScheduleSource;
}
export interface BenchTeams { red?: string; blue?: string }
export interface MatchExtras {
  ticks?: string[];
  sync?: SyncMarker;
  bench?: BenchTeams;
}
export type ExtrasPatch = { [Key in keyof MatchExtras]?: MatchExtras[Key] | undefined };

// the official app and both runtimes keep unknown metadata keys - all extras live under this one
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
  const source = value.source === "nexus" || value.source === "tba" ? value.source : undefined;
  return { eventKey, level: level as MatchLevel, number, red, blue, ...(source ? { source } : {}) };
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

// an undefined value in the patch removes that extra
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

// keeps its tba keys for stats - without a sync marker schedule sync never touches it
export function toWhatIfMatch(packet: MatchPacket): MatchPacket {
  return withExtras(packet, { sync: undefined });
}

