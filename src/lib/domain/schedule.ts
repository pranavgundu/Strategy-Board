import type { MatchLevel } from "./extras";
import { isObject } from "./json";

/** Which scheduled match a Synced Match is: the same identity whichever source reports it. */
export interface ScheduleIdentity {
  eventKey: string;
  level: MatchLevel;
  number: number;
}
/** Nexus's estimated and actual times for a match, in ms. */
export interface QueueTimes {
  scheduledStartTime?: number;
  estimatedQueueTime?: number;
  estimatedOnDeckTime?: number;
  estimatedOnFieldTime?: number;
  estimatedStartTime?: number;
  actualQueueTime?: number;
  actualOnDeckTime?: number;
  actualOnFieldTime?: number;
}
export interface ScheduleEntry {
  identity: ScheduleIdentity;
  /** Teams in Station order as the schedule lists them; a playoff alliance may list a fourth. */
  red: string[];
  blue: string[];
  /** Position in the source's schedule. */
  order: number;
  /** Nexus's Queue Status, like "Now queuing"; null when the source has none. */
  status: string | null;
  times: QueueTimes;
  played: boolean;
  /** A replay entry reports on the match it replays. */
  replay: boolean;
}
export interface EventSchedule {
  eventKey: string;
  source: "nexus" | "tba";
  entries: ScheduleEntry[];
}

const NEXUS_LEVELS: Record<string, MatchLevel> = { Practice: "practice", Qualification: "qual", Playoff: "playoff", Final: "final" };
const NAMES: Record<MatchLevel, string> = { practice: "Practice", qual: "Quals", playoff: "Playoff", final: "Final" };

export function identityKey({ eventKey, level, number }: ScheduleIdentity): string {
  return `${eventKey}:${level}:${number}`;
}

/** Named like the field display: Practice 3, Quals 12, Playoff 7, Final 2. */
export function scheduledMatchName({ level, number }: ScheduleIdentity): string {
  return `${NAMES[level]} ${number}`;
}

/** The TBA match key STATS looks up; practice matches have none. */
export function scheduledTbaMatchKey({ eventKey, level, number }: ScheduleIdentity): string | null {
  if (level === "qual") return `${eventKey}_qm${number}`;
  if (level === "playoff") return `${eventKey}_sf${number}m1`;
  if (level === "final") return `${eventKey}_f1m${number}`;
  return null;
}

export function eventFieldYear(eventKey: string): number | undefined {
  const year = /^(\d{4})/.exec(eventKey)?.[1];
  return year ? Number(year) : undefined;
}

const TIME_KEYS: readonly (keyof QueueTimes)[] = [
  "scheduledStartTime", "estimatedQueueTime", "estimatedOnDeckTime", "estimatedOnFieldTime", "estimatedStartTime",
  "actualQueueTime", "actualOnDeckTime", "actualOnFieldTime",
];

function queueTimes(value: unknown): QueueTimes {
  if (!isObject(value)) return {};
  return Object.fromEntries(TIME_KEYS.flatMap((key) => (typeof value[key] === "number" ? [[key, value[key]]] : [])));
}

const NEXUS_LABEL = /^(Practice|Qualification|Playoff|Final) (\d+)( Replay)?$/;

function teamList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const teams = value.filter((team): team is string => typeof team === "string" && team.trim() !== "").map((team) => team.trim());
  return teams.length ? teams : null;
}

/** Reads a Nexus live event status. Null means Nexus has no schedule for the event yet. */
export function parseNexusEvent(json: unknown): EventSchedule | null {
  if (!isObject(json) || typeof json.eventKey !== "string" || !Array.isArray(json.matches)) return null;
  const eventKey = json.eventKey;
  const matches = json.matches.map((match) => (isObject(match) ? match : {}));
  // played means a later match has reached the field, so look back from the end of the schedule
  const laterOnField: boolean[] = [];
  for (let index = matches.length - 1, seen = false; index >= 0; index--) {
    laterOnField[index] = seen;
    seen ||= matches[index].status === "On field" || typeof queueTimes(matches[index].times).actualOnFieldTime === "number";
  }
  const entries: ScheduleEntry[] = [];
  matches.forEach((match, order) => {
    const label = typeof match.label === "string" ? NEXUS_LABEL.exec(match.label.trim()) : null;
    const original = typeof match.replayOf === "string" ? NEXUS_LABEL.exec(match.replayOf.trim()) : null;
    const identity = original ?? label;
    const red = teamList(match.redTeams);
    const blue = teamList(match.blueTeams);
    if (!identity || !red || !blue) return;
    entries.push({
      identity: { eventKey, level: NEXUS_LEVELS[identity[1]], number: Number(identity[2]) },
      red,
      blue,
      order,
      status: typeof match.status === "string" ? match.status : null,
      times: queueTimes(match.times),
      played: laterOnField[order],
      replay: Boolean(original || label?.[3]),
    });
  });
  return entries.length ? { eventKey, source: "nexus", entries } : null;
}
