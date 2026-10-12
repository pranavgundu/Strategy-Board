import type { MatchLevel } from "./extras";
import { isObject } from "./json";

/** Which scheduled match a Synced Match is: the same identity whichever source reports it. */
export interface ScheduleIdentity {
  eventKey: string;
  level: MatchLevel;
  number: number;
}
export interface ScheduleEntry {
  identity: ScheduleIdentity;
  /** Teams in Station order as the schedule lists them; a playoff alliance may list a fourth. */
  red: string[];
  blue: string[];
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

function teamList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const teams = value.filter((team): team is string => typeof team === "string" && team.trim() !== "").map((team) => team.trim());
  return teams.length ? teams : null;
}

/** Reads a Nexus live event status. Null means Nexus has no schedule for the event yet. */
export function parseNexusEvent(json: unknown): EventSchedule | null {
  if (!isObject(json) || typeof json.eventKey !== "string" || !Array.isArray(json.matches)) return null;
  const eventKey = json.eventKey;
  const entries: ScheduleEntry[] = [];
  for (const match of json.matches) {
    if (!isObject(match) || typeof match.label !== "string") continue;
    const label = /^(Practice|Qualification|Playoff|Final) (\d+)$/.exec(match.label.trim());
    const red = teamList(match.redTeams);
    const blue = teamList(match.blueTeams);
    if (!label || !red || !blue) continue;
    entries.push({ identity: { eventKey, level: NEXUS_LEVELS[label[1]], number: Number(label[2]) }, red, blue });
  }
  return entries.length ? { eventKey, source: "nexus", entries } : null;
}
