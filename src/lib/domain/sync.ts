import type { MatchPacket } from "$lib/native/types";

import { readExtras, toWhatIfMatch, withExtras, type BenchTeams, type SyncMarker } from "./extras";
import type { Lineup } from "./ink";
import { isObject } from "./json";
import { newMatchPacket } from "./packets";
import { packetLineup, reassignStations } from "./reassign";
import { eventFieldYear, identityFromTbaKey, identityKey, parseTbaMatches, scheduledMatchName, scheduledTbaMatchKey, type EventSchedule, type QueueTimes, type ScheduleEntry, type ScheduleSource } from "./schedule";
import { ALLIANCE_STATIONS, OUR_TEAM, stationAlliance, type StationKey } from "./stations";

// identity keys by event key
export type DismissedMatches = Readonly<Record<string, readonly string[]>>;

export interface SyncInput {
  packets: readonly MatchPacket[];
  schedule: EventSchedule;
  dismissed?: DismissedMatches;
  newId: () => string;
}
// kept on the device and never written into packets
export interface ScheduleInfo {
  order: number;
  status: string | null;
  times: QueueTimes;
  played: boolean;
}
export interface SyncPlan {
  add: MatchPacket[];
  update: MatchPacket[];
  // by identity key
  schedule: Record<string, ScheduleInfo>;
  // identity key of the earliest unplayed synced match on the board
  nextMatch: string | null;
}

function stationTeams(teams: readonly string[]): [string, string, string] {
  return [teams[0] ?? "", teams[1] ?? "", teams[2] ?? ""];
}

// a fourth listed team sits on the bench
function includesOurTeam(entry: ScheduleEntry): boolean {
  return [...entry.red.slice(0, 4), ...entry.blue.slice(0, 4)].includes(OUR_TEAM);
}

function benchOf(entry: ScheduleEntry): BenchTeams | undefined {
  const bench: BenchTeams = {};
  if (entry.red[3]) bench.red = entry.red[3];
  if (entry.blue[3]) bench.blue = entry.blue[3];
  return bench.red || bench.blue ? bench : undefined;
}

function markerOf(entry: ScheduleEntry, source: ScheduleSource): SyncMarker {
  return { ...entry.identity, red: [...entry.red], blue: [...entry.blue], source };
}

const sameTeams = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((team, index) => team === b[index]);
const sameStationTeams = (a: readonly string[], b: readonly string[]) => sameTeams([...a.slice(0, 3)].sort(), [...b.slice(0, 3)].sort());

// a full list sets the stations in order - a shorter one keeps listed teams where they stand and never shifts anyone
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

// works on the match as it is now so hand edits survive the change
function applyScheduleChange(packet: MatchPacket, entry: ScheduleEntry, source: ScheduleSource): MatchPacket {
  return withExtras(reassignStations(packet, scheduledLineup(packetLineup(packet), entry)), { sync: markerOf(entry, source), bench: benchOf(entry) });
}

function followSchedule(packet: MatchPacket, marker: SyncMarker, entry: ScheduleEntry, source: ScheduleSource): MatchPacket | null {
  if (sameTeams(marker.red, entry.red) && sameTeams(marker.blue, entry.blue)) return null;
  const otherSourceOrder = marker.source !== undefined && marker.source !== source && sameStationTeams(marker.red, entry.red) && sameStationTeams(marker.blue, entry.blue);
  if (!otherSourceOrder) return applyScheduleChange(packet, entry, source);
  // tba never lists a bench team - keep the one already known
  return withExtras(packet, { sync: markerOf(entry, source), bench: benchOf(entry) ?? readExtras(packet).bench });
}

function syncedMatch(entry: ScheduleEntry, id: string, source: ScheduleSource): MatchPacket {
  const { identity } = entry;
  const packet = newMatchPacket({
    matchName: scheduledMatchName(identity),
    redTeams: stationTeams(entry.red),
    blueTeams: stationTeams(entry.blue),
    tbaEventKey: identity.eventKey,
    tbaMatchKey: scheduledTbaMatchKey(identity) ?? undefined,
    tbaYear: eventFieldYear(identity.eventKey),
  }, id);
  return withExtras(packet, { sync: markerOf(entry, source), bench: benchOf(entry) });
}

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
  const ours = new Set<string>();
  for (const [key, { first, last }] of entries) {
    info[key] = { order: first.order, status: last.status, times: { ...last.times }, played: last.played };
    if (includesOurTeam(last)) ours.add(key);
    const existing = board.get(key);
    if (existing) {
      const changed = followSchedule(existing, readExtras(existing).sync!, last, schedule.source);
      if (changed) update.push(changed);
      continue;
    }
    if (skipped.has(key)) continue;
    onBoard.add(key);
    add.push(syncedMatch(last, newId(), schedule.source));
  }
  const nextMatch = Object.entries(info)
    .filter(([key, { played }]) => !played && onBoard.has(key) && ours.has(key))
    .sort(([, a], [, b]) => a.order - b.order)[0]?.[0] ?? null;
  return { add, update, schedule: info, nextMatch };
}

const LEVEL_RANK: Record<string, number> = { practice: 0, qual: 1, playoff: 2, final: 3 };

// matches the schedule no longer lists go after the rest - by level and number
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

export function readDismissedMatches(value: unknown): DismissedMatches {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((key) => typeof key === "string")));
}

export function restoreDismissed(dismissed: DismissedMatches, eventKey: string): DismissedMatches {
  return Object.fromEntries(Object.entries(dismissed).filter(([key]) => key !== eventKey));
}

export function matchEventKey(packet: MatchPacket): string | null {
  return readExtras(packet).sync?.eventKey ?? (typeof packet[9] === "string" && packet[9] ? packet[9] : null);
}

export interface EventGroup<T extends MatchPacket> {
  // null for the what-if matches made with new
  eventKey: string | null;
  current: boolean;
  packets: T[];
}

// the current event first - then other events by most recently added - then what-if matches
export function groupMatchesByEvent<T extends MatchPacket>(packets: readonly T[], currentEventKey: string | null): EventGroup<T>[] {
  const groups = new Map<string | null, { packets: T[]; last: number }>();
  packets.forEach((packet, index) => {
    const eventKey = matchEventKey(packet);
    const group = groups.get(eventKey) ?? { packets: [], last: index };
    group.packets.push(packet);
    group.last = index;
    groups.set(eventKey, group);
  });
  const rank = (eventKey: string | null) => (eventKey === null ? 2 : eventKey === currentEventKey ? 0 : 1);
  return [...groups.entries()]
    .sort(([a, first], [b, second]) => rank(a) - rank(b) || second.last - first.last)
    .map(([eventKey, group]) => ({ eventKey, current: eventKey !== null && eventKey === currentEventKey, packets: group.packets }));
}

export interface EventQueue {
  eventKey: string;
  schedule: Record<string, ScheduleInfo>;
  nextMatch: string | null;
}
export interface HomeEventGroup<T extends MatchPacket> {
  eventKey: string | null;
  current: boolean;
  dismissedCount: number;
  matches: { packet: T; next: boolean; info: ScheduleInfo | null }[];
}

function syncKey(packet: MatchPacket): string | null {
  const marker = readExtras(packet).sync;
  return marker ? identityKey(marker) : null;
}

export function homeEventGroups<T extends MatchPacket>(packets: readonly T[], { currentEventKey, queue, dismissed }: { currentEventKey: string | null; queue: EventQueue | null; dismissed: DismissedMatches }): HomeEventGroup<T>[] {
  const groups = groupMatchesByEvent(packets, currentEventKey);
  if (currentEventKey && dismissed[currentEventKey]?.length && !groups.some((group) => group.eventKey === currentEventKey)) groups.unshift({ eventKey: currentEventKey, current: true, packets: [] });
  return groups.map((group) => {
    const info = queue && queue.eventKey === group.eventKey ? queue : null;
    const sorted = group.eventKey ? scheduleSort(group.packets, info?.schedule ?? {}) : group.packets;
    const next = info?.nextMatch ? sorted.find((packet) => syncKey(packet) === info.nextMatch) : undefined;
    return {
      eventKey: group.eventKey,
      current: group.current,
      dismissedCount: group.eventKey ? dismissed[group.eventKey]?.length ?? 0 : 0,
      matches: [...(next ? [next] : []), ...sorted.filter((packet) => packet !== next)].map((packet) => {
        const key = syncKey(packet);
        return { packet, next: packet === next, info: (info && key && info.schedule[key]) || null };
      }),
    };
  });
}

export function swapBenchTeam(packet: MatchPacket, station: StationKey): MatchPacket {
  const alliance = stationAlliance(station);
  const bench = readExtras(packet).bench;
  const incoming = bench?.[alliance];
  if (!incoming) return packet;
  const lineup = packetLineup(packet);
  const displaced = lineup[station].trim();
  return withExtras(reassignStations(packet, { ...lineup, [station]: incoming }), { bench: { ...bench, [alliance]: displaced || undefined } });
}

function packetIdentityKey(packet: MatchPacket): string | null {
  const marker = readExtras(packet).sync;
  const identity = marker ?? (typeof packet[10] === "string" ? identityFromTbaKey(packet[10]) : null);
  return identity ? identityKey(identity) : null;
}

export interface TbaImportInput {
  packets: readonly MatchPacket[];
  matches: unknown;
  eventKey: string;
  // null imports every match
  team: string | null;
  currentEventKey: string | null;
  newId: () => string;
}

// matches for the current event come in as synced matches - the rest as what-if matches
export function planTbaImport({ packets, matches, eventKey, team, currentEventKey, newId }: TbaImportInput): MatchPacket[] {
  const schedule = parseTbaMatches(matches, eventKey);
  if (!schedule) return [];
  const onBoard = new Set(packets.map(packetIdentityKey).filter((key): key is string => key !== null));
  const imported: MatchPacket[] = [];
  for (const entry of schedule.entries) {
    const key = identityKey(entry.identity);
    if ((team && ![...entry.red, ...entry.blue].includes(team)) || onBoard.has(key)) continue;
    onBoard.add(key);
    const packet = syncedMatch(entry, newId(), schedule.source);
    imported.push(eventKey === currentEventKey ? packet : toWhatIfMatch(packet));
  }
  return imported;
}
