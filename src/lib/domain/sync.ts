import type { MatchPacket } from "$lib/native/types";

import { readExtras, withExtras } from "./extras";
import { newMatchPacket } from "./packets";
import { eventFieldYear, identityKey, scheduledMatchName, scheduledTbaMatchKey, type EventSchedule, type ScheduleEntry } from "./schedule";
import { OUR_TEAM } from "./stations";

export interface SyncInput {
  packets: readonly MatchPacket[];
  schedule: EventSchedule;
  newId: () => string;
}
export interface SyncPlan {
  /** New Synced Matches to add to the board. */
  add: MatchPacket[];
  /** Synced Matches whose stored packet changes. */
  update: MatchPacket[];
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
  for (const entry of schedule.entries) {
    const key = identityKey(entry.identity);
    if (!includesOurTeam(entry) || onBoard.has(key)) continue;
    onBoard.add(key);
    add.push(syncedMatch(entry, newId()));
  }
  return { add, update: [] };
}
