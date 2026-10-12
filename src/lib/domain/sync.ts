import type { MatchPacket } from "$lib/native/types";

import { readExtras, withExtras } from "./extras";
import { newMatchPacket } from "./packets";
import { eventFieldYear, identityKey, scheduledMatchName, scheduledTbaMatchKey, type EventSchedule, type QueueTimes, type ScheduleEntry } from "./schedule";
import { OUR_TEAM } from "./stations";

export interface SyncInput {
  packets: readonly MatchPacket[];
  schedule: EventSchedule;
  newId: () => string;
}
/** What the schedule says about one of Our Team's matches; kept on the device, never in packets. */
export interface ScheduleInfo {
  order: number;
  status: string | null;
  times: QueueTimes;
  played: boolean;
}
export interface SyncPlan {
  /** New Synced Matches to add to the board. */
  add: MatchPacket[];
  /** Synced Matches whose stored packet changes. */
  update: MatchPacket[];
  /** Schedule info for Our Team's matches, by identity key. */
  schedule: Record<string, ScheduleInfo>;
  /** The identity key of the earliest Synced Match on the board that hasn't been played. */
  nextMatch: string | null;
}

function stations(teams: readonly string[]): [string, string, string] {
  return [teams[0] ?? "", teams[1] ?? "", teams[2] ?? ""];
}

function includesOurTeam(entry: ScheduleEntry): boolean {
  return [...entry.red.slice(0, 3), ...entry.blue.slice(0, 3)].includes(OUR_TEAM);
}

function syncedMatch(entry: ScheduleEntry, id: string): MatchPacket {
  const { identity } = entry;
  const packet = newMatchPacket({
    matchName: scheduledMatchName(identity),
    redTeams: stations(entry.red),
    blueTeams: stations(entry.blue),
    tbaEventKey: identity.eventKey,
    tbaMatchKey: scheduledTbaMatchKey(identity) ?? undefined,
    tbaYear: eventFieldYear(identity.eventKey),
  }, id);
  return withExtras(packet, { sync: { ...identity, red: [...entry.red], blue: [...entry.blue] } });
}

/** Works out how the board should change to follow the schedule. It never touches storage. */
export function planSync({ packets, schedule, newId }: SyncInput): SyncPlan {
  const onBoard = new Set(packets.flatMap((packet) => {
    const marker = readExtras(packet).sync;
    return marker ? [identityKey(marker)] : [];
  }));
  const add: MatchPacket[] = [];
  const info: Record<string, ScheduleInfo> = {};
  for (const entry of schedule.entries) {
    if (!includesOurTeam(entry)) continue;
    const key = identityKey(entry.identity);
    // a replay keeps the original's place in the schedule but reports its own progress
    info[key] = { order: info[key]?.order ?? entry.order, status: entry.status, times: { ...entry.times }, played: entry.played };
    if (onBoard.has(key)) continue;
    onBoard.add(key);
    add.push(syncedMatch(entry, newId()));
  }
  const nextMatch = Object.entries(info)
    .filter(([key, { played }]) => !played && onBoard.has(key))
    .sort(([, a], [, b]) => a.order - b.order)[0]?.[0] ?? null;
  return { add, update: [], schedule: info, nextMatch };
}

const LEVEL_RANK: Record<string, number> = { practice: 0, qual: 1, playoff: 2, final: 3 };

/** Synced Matches in schedule order; matches the schedule no longer lists follow, by level and number. */
export function scheduleSort<T extends MatchPacket>(packets: readonly T[], schedule: Readonly<Record<string, ScheduleInfo>>): T[] {
  const rank = (packet: T): [number, number] => {
    const marker = readExtras(packet).sync;
    if (!marker) return [2, 0];
    const known = schedule[identityKey(marker)];
    return known ? [0, known.order] : [1, LEVEL_RANK[marker.level] * 10_000 + marker.number];
  };
  return packets.map((packet) => ({ packet, rank: rank(packet) }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1])
    .map(({ packet }) => packet);
}
