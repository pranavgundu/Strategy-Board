import { isObject } from "./json";
import { parseNexusEvent, type ScheduleSource } from "./schedule";
import { OUR_TEAM } from "./stations";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EventCandidate {
  eventKey: string;
  name: string | null;
  start: number;
  end: number;
}
export type CurrentEventSource = "manual" | ScheduleSource;
export interface CurrentEvent {
  eventKey: string;
  name: string | null;
  source: CurrentEventSource;
  // a detected event is kept until it ends - null for a hand-entered key
  end: number | null;
}

export function isEventKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}[a-z0-9]+$/.test(value);
}

export function isStillRunning(event: CurrentEvent | null, now: number): event is CurrentEvent {
  return event !== null && event.end !== null && now <= event.end + DAY_MS;
}

function running(candidates: EventCandidate[], now: number): EventCandidate[] {
  return candidates
    .filter((event) => event.start - DAY_MS <= now && now <= event.end + DAY_MS)
    .sort((a, b) => a.start - b.start);
}

export function runningNexusEvents(json: unknown, now: number): EventCandidate[] {
  if (!isObject(json)) return [];
  return running(Object.entries(json).flatMap(([eventKey, event]) => {
    if (!isObject(event) || typeof event.start !== "number" || typeof event.end !== "number") return [];
    return [{ eventKey, name: typeof event.name === "string" ? event.name : null, start: event.start, end: event.end }];
  }), now);
}

// tba gives local dates - so each event spans whole days before the slack is added
export function runningTbaEvents(json: unknown, now: number): EventCandidate[] {
  if (!Array.isArray(json)) return [];
  return running(json.flatMap((event) => {
    if (!isObject(event) || typeof event.key !== "string" || typeof event.start_date !== "string" || typeof event.end_date !== "string") return [];
    const start = Date.parse(`${event.start_date}T00:00:00Z`);
    const end = Date.parse(`${event.end_date}T23:59:59Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
    return [{ eventKey: event.key, name: typeof event.name === "string" ? event.name : null, start, end }];
  }), now);
}

function scheduleIncludesOurTeam(json: unknown): boolean {
  return parseNexusEvent(json)?.entries.some((entry) => [...entry.red, ...entry.blue].includes(OUR_TEAM)) ?? false;
}

export interface CurrentEventInput {
  manualEventKey: string | null;
  nexusEvents: unknown;
  // live status by event key - only the running events get looked up
  nexusSchedules: Readonly<Record<string, unknown>>;
  // only our team's events this year
  tbaEvents: unknown;
  now: number;
}

export function pickCurrentEvent({ manualEventKey, nexusEvents, nexusSchedules, tbaEvents, now }: CurrentEventInput): CurrentEvent | null {
  if (manualEventKey) return { eventKey: manualEventKey, name: null, source: "manual", end: null };
  const nexus = runningNexusEvents(nexusEvents, now).find((event) => scheduleIncludesOurTeam(nexusSchedules[event.eventKey]));
  if (nexus) return { eventKey: nexus.eventKey, name: nexus.name, source: "nexus", end: nexus.end };
  const tba = runningTbaEvents(tbaEvents, now)[0];
  return tba ? { eventKey: tba.eventKey, name: tba.name, source: "tba", end: tba.end } : null;
}
