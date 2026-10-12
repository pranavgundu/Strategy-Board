import type { MatchPacket } from "$lib/native/types";

import { readExtras, toWhatIfMatch, withExtras, type BenchTeams, type SyncMarker } from "./extras";
import type { Lineup } from "./ink";
import { newMatchPacket } from "./packets";
import { packetLineup, reassignStations } from "./reassign";
import { eventFieldYear, identityFromTbaKey, identityKey, parseTbaMatches, scheduledMatchName, scheduledTbaMatchKey, type EventSchedule, type QueueTimes, type ScheduleEntry } from "./schedule";
import { OUR_TEAM, stationAlliance, type StationKey } from "./stations";

/** Deleted Synced Matches as identity keys by event key; Schedule Sync never adds them again. */
export type DismissedMatches = Readonly<Record<string, readonly string[]>>;

export interface SyncInput {
  packets: readonly MatchPacket[];
  schedule: EventSchedule;
  dismissed?: DismissedMatches;
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

/** 1690 plays in a Station or sits as an alliance's Bench Team. */
function includesOurTeam(entry: ScheduleEntry): boolean {
  return [...entry.red.slice(0, 4), ...entry.blue.slice(0, 4)].includes(OUR_TEAM);
}

function benchOf(entry: ScheduleEntry): BenchTeams | undefined {
  const bench: BenchTeams = {};
  if (entry.red[3]) bench.red = entry.red[3];
  if (entry.blue[3]) bench.blue = entry.blue[3];
  return bench.red || bench.blue ? bench : undefined;
}

function markerOf(entry: ScheduleEntry): SyncMarker {
  return { ...entry.identity, red: [...entry.red], blue: [...entry.blue] };
}

const sameTeams = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((team, index) => team === b[index]);

const ALLIANCE_STATIONS: Record<"red" | "blue", readonly StationKey[]> = { red: ["redOne", "redTwo", "redThree"], blue: ["blueOne", "blueTwo", "blueThree"] };

/** A full list sets the Stations in order; a shorter one keeps listed teams where they stand and never shifts anyone. */
function scheduledLineup(current: Lineup, entry: ScheduleEntry): Lineup {
  const lineup: Record<StationKey, string> = { ...current };
  for (const alliance of ["red", "blue"] as const) {
    const stations = ALLIANCE_STATIONS[alliance];
    const listed = entry[alliance].slice(0, 3);
    if (listed.length === 3) {
      stations.forEach((station, index) => { lineup[station] = listed[index]; });
      continue;
    }
    const kept = stations.filter((station) => listed.includes(current[station].trim()));
    const arriving = listed.filter((team) => !kept.some((station) => current[station].trim() === team));
    for (const station of stations) if (!kept.includes(station)) lineup[station] = arriving.shift() ?? "";
  }
  return lineup;
}

/** Applies a team change the schedule reports to a Synced Match's current state, hand edits included. */
function applyScheduleChange(packet: MatchPacket, entry: ScheduleEntry): MatchPacket {
  return withExtras(reassignStations(packet, scheduledLineup(packetLineup(packet), entry)), { sync: markerOf(entry), bench: benchOf(entry) });
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
  return withExtras(packet, { sync: markerOf(entry), bench: benchOf(entry) });
}

/** Works out how the board should change to follow the schedule. It never touches storage. */
export function planSync({ packets, schedule, dismissed = {}, newId }: SyncInput): SyncPlan {
  const skipped = new Set(dismissed[schedule.eventKey] ?? []);
  const board = new Map<string, MatchPacket>();
  for (const packet of packets) {
    const marker = readExtras(packet).sync;
    if (marker) board.set(identityKey(marker), packet);
  }
  // a replay keeps the original's place in the schedule but reports its own teams and progress
  const entries = new Map<string, { first: ScheduleEntry; last: ScheduleEntry }>();
  for (const entry of schedule.entries) {
    const key = identityKey(entry.identity);
    if (!includesOurTeam(entry) && !board.has(key)) continue;
    entries.set(key, { first: entries.get(key)?.first ?? entry, last: entry });
  }
  const add: MatchPacket[] = [];
  const update: MatchPacket[] = [];
  const info: Record<string, ScheduleInfo> = {};
  const onBoard = new Set(board.keys());
  for (const [key, { first, last }] of entries) {
    info[key] = { order: first.order, status: last.status, times: { ...last.times }, played: last.played };
    const existing = board.get(key);
    if (existing) {
      const marker = readExtras(existing).sync!;
      if (!sameTeams(marker.red, last.red) || !sameTeams(marker.blue, last.blue)) update.push(applyScheduleChange(existing, last));
      continue;
    }
    if (skipped.has(key)) continue;
    onBoard.add(key);
    add.push(syncedMatch(last, newId()));
  }
  const nextMatch = Object.entries(info)
    .filter(([key, { played }]) => !played && onBoard.has(key))
    .sort(([, a], [, b]) => a.order - b.order)[0]?.[0] ?? null;
  return { add, update, schedule: info, nextMatch };
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

/** Records the Synced Matches among deleted Matches; What-if Matches leave nothing behind. */
export function dismissMatches(dismissed: DismissedMatches, deleted: readonly MatchPacket[]): DismissedMatches {
  const next: Record<string, string[]> = Object.fromEntries(Object.entries(dismissed).map(([eventKey, keys]) => [eventKey, [...keys]]));
  for (const packet of deleted) {
    const marker = readExtras(packet).sync;
    if (!marker) continue;
    const keys = (next[marker.eventKey] ??= []);
    const key = identityKey(marker);
    if (!keys.includes(key)) keys.push(key);
  }
  return next;
}

export function restoreDismissed(dismissed: DismissedMatches, eventKey: string): DismissedMatches {
  return Object.fromEntries(Object.entries(dismissed).filter(([key]) => key !== eventKey));
}

/** The event a Match belongs to: its schedule identity, else its TBA event key; null for a Match made with New. */
export function matchEventKey(packet: MatchPacket): string | null {
  return readExtras(packet).sync?.eventKey ?? (typeof packet[9] === "string" && packet[9] ? packet[9] : null);
}

export interface EventGroup<T extends MatchPacket> {
  /** Null for the What-if Matches made with New. */
  eventKey: string | null;
  current: boolean;
  packets: T[];
}

/** Home's groups: the Current Event first, then other events most recently added to first, then What-if Matches made with New. */
export function groupMatchesByEvent<T extends MatchPacket>(packets: readonly T[], currentEventKey: string | null): EventGroup<T>[] {
  const groups = new Map<string | null, { packets: T[]; last: number }>();
  packets.forEach((packet, index) => {
    const eventKey = matchEventKey(packet);
    const group = groups.get(eventKey) ?? { packets: [], last: index };
    group.packets.push(packet);
    group.last = index;
    groups.set(eventKey, group);
  });
  const rank = (eventKey: string | null) => (eventKey === currentEventKey ? 0 : eventKey === null ? 2 : 1);
  return [...groups.entries()]
    .sort(([a, first], [b, second]) => rank(a) - rank(b) || second.last - first.last)
    .map(([eventKey, group]) => ({ eventKey, current: eventKey !== null && eventKey === currentEventKey, packets: group.packets }));
}

/** Swaps an alliance's Bench Team into one of its Stations; the team it displaces becomes the Bench Team. */
export function swapBenchTeam(packet: MatchPacket, station: StationKey): MatchPacket {
  const alliance = stationAlliance(station);
  const bench = readExtras(packet).bench;
  const incoming = bench?.[alliance];
  if (!incoming) return packet;
  const lineup = packetLineup(packet);
  const displaced = lineup[station].trim();
  return withExtras(reassignStations(packet, { ...lineup, [station]: incoming }), { bench: { ...bench, [alliance]: displaced || undefined } });
}

/** A Match's schedule identity from its sync marker, or else from its TBA match key. */
function packetIdentityKey(packet: MatchPacket): string | null {
  const marker = readExtras(packet).sync;
  const identity = marker ?? (typeof packet[10] === "string" ? identityFromTbaKey(packet[10]) : null);
  return identity ? identityKey(identity) : null;
}

export interface TbaImportInput {
  packets: readonly MatchPacket[];
  /** TBA's match list for the event. */
  matches: unknown;
  eventKey: string;
  /** Only this team's matches, or every match when null. */
  team: string | null;
  currentEventKey: string | null;
  newId: () => string;
}

/** The Matches a manual TBA import adds: none already on the board, and Synced Matches for the Current Event. */
export function planTbaImport({ packets, matches, eventKey, team, currentEventKey, newId }: TbaImportInput): MatchPacket[] {
  const schedule = parseTbaMatches(matches, eventKey);
  if (!schedule) return [];
  const onBoard = new Set(packets.map(packetIdentityKey).filter((key): key is string => key !== null));
  const imported: MatchPacket[] = [];
  for (const entry of schedule.entries) {
    const key = identityKey(entry.identity);
    if ((team && ![...entry.red, ...entry.blue].includes(team)) || onBoard.has(key)) continue;
    onBoard.add(key);
    const packet = syncedMatch(entry, newId());
    imported.push(eventKey === currentEventKey ? packet : toWhatIfMatch(packet));
  }
  return imported;
}
