import { isObject } from "./json";

export type MatchLevel = "practice" | "qual" | "playoff" | "final";
export const MATCH_LEVELS: readonly MatchLevel[] = ["practice", "qual", "playoff", "final"];
export type ScheduleSource = "nexus" | "tba";
export const SCHEDULE_SOURCE_NAMES: Readonly<Record<ScheduleSource, string>> = { nexus: "Nexus", tba: "TBA" };

// the same identity whichever source reports the match
export interface ScheduleIdentity {
  eventKey: string;
  level: MatchLevel;
  number: number;
}
// nexus's estimated and actual times in ms
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
  // in station order - a playoff alliance may list a fourth team
  red: string[];
  blue: string[];
  order: number;
  status: string | null;
  times: QueueTimes;
  played: boolean;
  // a replay entry reports on the match it replays
  replay: boolean;
}
export interface EventSchedule {
  eventKey: string;
  source: ScheduleSource;
  entries: ScheduleEntry[];
}

const NEXUS_LEVELS: Record<string, MatchLevel> = { Practice: "practice", Qualification: "qual", Playoff: "playoff", Final: "final" };
const LEVEL_NAMES: Record<MatchLevel, string> = { practice: "Practice", qual: "Quals", playoff: "Playoff", final: "Final" };

export function identityKey({ eventKey, level, number }: ScheduleIdentity): string {
  return `${eventKey}:${level}:${number}`;
}

export function scheduledMatchName({ level, number }: ScheduleIdentity): string {
  return `${LEVEL_NAMES[level]} ${number}`;
}

export function scheduledTbaMatchKey({ eventKey, level, number }: ScheduleIdentity): string | null {
  if (level === "qual") return `${eventKey}_qm${number}`;
  if (level === "playoff") return `${eventKey}_sf${number}m1`;
  if (level === "final") return `${eventKey}_f1m${number}`;
  return null;
}

// tba keys look like 2026isde1_qm13 or 2026isde1_sf7m1 or 2026isde1_f1m2
export function identityFromTbaKey(key: string): ScheduleIdentity | null {
  const quals = /^(\w+)_qm(\d+)$/.exec(key);
  if (quals) return { eventKey: quals[1], level: "qual", number: Number(quals[2]) };
  const playoff = /^(\w+)_(sf|f)(\d+)m(\d+)$/.exec(key);
  if (!playoff) return null;
  return playoff[2] === "sf"
    ? { eventKey: playoff[1], level: "playoff", number: Number(playoff[3]) }
    : { eventKey: playoff[1], level: "final", number: Number(playoff[4]) };
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

// a gap stays an empty station so the teams after it keep theirs - null while the alliance is undecided
function teamList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const teams = value.map((team) => (typeof team === "string" ? team.trim() : ""));
  return teams.some(Boolean) ? teams : null;
}

// null while nexus has no schedule for the event yet
export function parseNexusEvent(json: unknown): EventSchedule | null {
  if (!isObject(json) || typeof json.eventKey !== "string" || !Array.isArray(json.matches)) return null;
  const eventKey = json.eventKey;
  const matches = json.matches.map((match) => (isObject(match) ? match : {}));
  // played means a later match has reached the field - so look back from the end of the schedule
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

const TBA_LEVEL_RANK: Readonly<Record<string, number>> = { qm: 0, sf: 1, f: 2 };

// playoff N is tba's sfNm1 and any later sfN match replays it - final N is f1mN
function tbaIdentity(eventKey: string, compLevel: string, setNumber: number, matchNumber: number): { identity: ScheduleIdentity; replay: boolean } | null {
  if (compLevel === "qm") return { identity: { eventKey, level: "qual", number: matchNumber }, replay: false };
  if (compLevel === "sf") return { identity: { eventKey, level: "playoff", number: setNumber }, replay: matchNumber > 1 };
  if (compLevel === "f") return { identity: { eventKey, level: "final", number: matchNumber }, replay: false };
  return null;
}

function tbaAlliance(value: unknown): { teams: string[] | null; score: number } {
  if (!isObject(value)) return { teams: null, score: -1 };
  const teams = teamList(Array.isArray(value.team_keys) ? value.team_keys.map((key) => (typeof key === "string" ? key.replace(/^frc/, "") : key)) : null);
  return { teams, score: typeof value.score === "number" ? value.score : -1 };
}

// tba has no queue status - a match counts as played once it has a result
export function parseTbaMatches(json: unknown, eventKey: string): EventSchedule | null {
  if (!Array.isArray(json)) return null;
  const matches = json
    .filter(isObject)
    .filter((match) => typeof match.comp_level === "string" && match.comp_level in TBA_LEVEL_RANK && typeof match.set_number === "number" && typeof match.match_number === "number")
    .sort((a, b) => TBA_LEVEL_RANK[a.comp_level as string] - TBA_LEVEL_RANK[b.comp_level as string] || (a.set_number as number) - (b.set_number as number) || (a.match_number as number) - (b.match_number as number));
  const entries: ScheduleEntry[] = [];
  matches.forEach((match, order) => {
    const parsed = tbaIdentity(eventKey, match.comp_level as string, match.set_number as number, match.match_number as number);
    const alliances = isObject(match.alliances) ? match.alliances : {};
    const red = tbaAlliance(alliances.red);
    const blue = tbaAlliance(alliances.blue);
    if (!parsed || !red.teams || !blue.teams) return;
    entries.push({
      identity: parsed.identity,
      red: red.teams,
      blue: blue.teams,
      order,
      status: null,
      times: typeof match.time === "number" ? { scheduledStartTime: match.time * 1000 } : {},
      played: red.score >= 0 && blue.score >= 0,
      replay: parsed.replay,
    });
  });
  return entries.length ? { eventKey, source: "tba", entries } : null;
}
