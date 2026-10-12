import { dismissMatches, OUR_TEAM, parseNexusEvent, parseTbaMatches, pickCurrentEvent, planSync, readDismissedMatches, restoreDismissed, runningNexusEvents, type CurrentEvent, type DismissedMatches, type EventSchedule, type ScheduleInfo } from "$lib/domain";
import { newId } from "$lib/features/runtime";
import { native } from "$lib/native/api";
import type { JsonValue, MatchPacket, SourceResponse } from "$lib/native/types";

import { app } from "./app.svelte";

const MANUAL_EVENT_KEY = "manualEventKey";
const BOOKKEEPING_KEY = "syncBookkeeping";
const QUEUE_KEY = "queueStatus";
const DISMISSED_KEY = "dismissedMatches";
const EVENT_KEY = /^\d{4}[a-z0-9]+$/;
const NEXUS_INTERVAL_MS = 30_000;
// tba caches responses for 61 seconds, so asking more often only repeats the same answer
const TBA_INTERVAL_MS = 60_000;
const DETECTION_RETRY_MS = 5 * 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SyncSource = "nexus" | "tba";
export type SyncState = "idle" | "syncing" | "synced" | "waiting" | "offline" | "error";
export interface SyncStatus {
  state: SyncState;
  message: string;
  eventKey: string | null;
  /** The source of the last successful sync. */
  source: SyncSource | null;
  /** When the schedule was last read successfully, in ms. */
  at: number | null;
}
/** Queue Status and the Next Match for the event last synced. */
export interface EventQueue {
  eventKey: string;
  schedule: Record<string, ScheduleInfo>;
  nextMatch: string | null;
}
interface Bookkeeping {
  etags: Record<string, string>;
  source: SyncSource | null;
  eventKey: string | null;
  at: number | null;
}

let manualEventKey = $state<string | null>(null);
let currentEvent = $state<CurrentEvent | null>(null);
let queue = $state.raw<EventQueue | null>(null);
let dismissed = $state.raw<DismissedMatches>({});
/** The Matches the last sync changed, so an open Match can reload; the revision makes each change distinct. */
let lastChange = $state.raw<{ revision: number; ids: readonly string[] }>({ revision: 0, ids: [] });
let detectedAt = 0;
let status = $state<SyncStatus>({ state: "idle", message: "", eventKey: null, source: null, at: null });
let bookkeeping: Bookkeeping = { etags: {}, source: null, eventKey: null, at: null };
let loading: Promise<void> | null = null;
let running: Promise<void> | null = null;
let polling = false;
let timer: number | null = null;

const SOURCE_NAMES: Record<SyncSource, { name: string; key: string }> = {
  nexus: { name: "Nexus", key: "NEXUS_API_KEY" },
  tba: { name: "TBA", key: "TBA_API_KEY" },
};

function failureMessage(response: SourceResponse, eventKey: string, source: SyncSource = "nexus"): string {
  const { name, key } = SOURCE_NAMES[source];
  switch (response.kind) {
    case "not-found": return `${name} has no event called ${eventKey}.`;
    case "missing-key": return `This build has no ${name} API key. Add ${key} to orbit-strategy-board.env and rebuild.`;
    case "rejected-key": return `${name} rejected this build's API key.`;
    case "offline": return "You're offline. Sync resumes when the connection returns.";
    case "unreachable": return `Couldn't reach ${name} (${response.detail}).`;
    default: return "Sync failed.";
  }
}

function report(state: SyncState, message: string, eventKey: string | null): void {
  status = { state, message, eventKey, source: bookkeeping.source, at: bookkeeping.at };
}

async function remember(source: SyncSource, eventKey: string, etagKey: string, etag: string | null): Promise<void> {
  const etags = { ...bookkeeping.etags };
  if (etag) etags[etagKey] = etag;
  else delete etags[etagKey];
  bookkeeping = { etags, source, eventKey, at: Date.now() };
  await native.storage.set(BOOKKEEPING_KEY, bookkeeping as unknown as JsonValue).catch(() => undefined);
}

function readBookkeeping(value: unknown): Bookkeeping {
  const stored = typeof value === "object" && value !== null && !Array.isArray(value) ? value as Partial<Bookkeeping> : {};
  return {
    etags: typeof stored.etags === "object" && stored.etags !== null ? stored.etags : {},
    source: stored.source === "nexus" || stored.source === "tba" ? stored.source : null,
    eventKey: typeof stored.eventKey === "string" ? stored.eventKey : null,
    at: typeof stored.at === "number" ? stored.at : null,
  };
}

/** The hand-entered event, a detected event that hasn't ended yet, or a fresh detection. */
async function resolveCurrentEvent(): Promise<{ event: CurrentEvent | null; problem: string | null }> {
  const now = Date.now();
  if (manualEventKey) return { event: pickCurrentEvent({ manualEventKey, nexusEvents: null, nexusSchedules: {}, tbaEvents: null, now }), problem: null };
  if (currentEvent?.source !== "manual" && currentEvent?.end != null && now <= currentEvent.end + DAY_MS) return { event: currentEvent, problem: null };
  if (now - detectedAt < DETECTION_RETRY_MS) return { event: null, problem: null };
  detectedAt = now;
  const list = await native.nexus.events();
  if (list.kind === "missing-key" || list.kind === "rejected-key" || list.kind === "offline") return { event: null, problem: failureMessage(list, "") };
  const nexusEvents = list.kind === "ok" ? list.data : null;
  const nexusSchedules: Record<string, unknown> = {};
  for (const candidate of runningNexusEvents(nexusEvents, now)) {
    const response = await native.nexus.eventStatus(candidate.eventKey);
    if (response.kind === "ok") nexusSchedules[candidate.eventKey] = response.data;
  }
  let event = pickCurrentEvent({ manualEventKey: null, nexusEvents, nexusSchedules, tbaEvents: null, now });
  if (!event) {
    const tbaEvents = await native.tba.teamEvents(OUR_TEAM, new Date(now).getUTCFullYear()).catch(() => null);
    event = pickCurrentEvent({ manualEventKey: null, nexusEvents, nexusSchedules, tbaEvents, now });
  }
  return { event, problem: null };
}

async function run(): Promise<void> {
  const resolved = await resolveCurrentEvent();
  currentEvent = resolved.event;
  if (!resolved.event) {
    report(resolved.problem ? "error" : "waiting", resolved.problem ?? "Waiting for schedule.", null);
    return;
  }
  const eventKey = resolved.event.eventKey;
  report("syncing", status.message, eventKey);
  const etagKey = `nexus:event:${eventKey}`;
  let response: SourceResponse;
  try {
    response = await native.nexus.eventStatus(eventKey, bookkeeping.etags[etagKey]);
  } catch {
    report("error", "Schedule Sync isn't available in this build.", eventKey);
    return;
  }
  if (response.kind === "not-modified") {
    await remember("nexus", eventKey, etagKey, response.etag);
    report("synced", "Up to date with Nexus.", eventKey);
    return;
  }
  const schedule = response.kind === "ok" ? parseNexusEvent(response.data) : null;
  if (schedule) await applySchedule(schedule, etagKey, response.kind === "ok" ? response.etag : null);
  else if (response.kind === "ok" || response.kind === "not-found") await syncFromTba(eventKey);
  else report(response.kind === "offline" ? "offline" : "error", failureMessage(response, eventKey), eventKey);
}

/** Used while Nexus has no schedule for the event; TBA has no Queue Status and no practice matches. */
async function syncFromTba(eventKey: string): Promise<void> {
  if (bookkeeping.source === "tba" && bookkeeping.eventKey === eventKey && bookkeeping.at !== null && Date.now() - bookkeeping.at < TBA_INTERVAL_MS) {
    report("synced", "Up to date with TBA.", eventKey);
    return;
  }
  const etagKey = `tba:matches:${eventKey}`;
  const response = await native.tba.teamMatchesStatus(OUR_TEAM, eventKey, bookkeeping.etags[etagKey]);
  if (response.kind === "not-modified") {
    await remember("tba", eventKey, etagKey, response.etag);
    report("synced", "Up to date with TBA.", eventKey);
    return;
  }
  if (response.kind !== "ok") {
    report(response.kind === "offline" ? "offline" : "error", failureMessage(response, eventKey, "tba"), eventKey);
    return;
  }
  const schedule = parseTbaMatches(response.data, eventKey);
  if (schedule) await applySchedule(schedule, etagKey, response.etag);
  else report("waiting", `Waiting for the ${eventKey} schedule.`, eventKey);
}

async function applySchedule(schedule: EventSchedule, etagKey: string, etag: string | null): Promise<void> {
  const { eventKey, source } = schedule;
  await app.init();
  const plan = await app.applySync((packets) => planSync({ packets, schedule, dismissed, newId }));
  if (plan.update.length) lastChange = { revision: lastChange.revision + 1, ids: plan.update.map((packet) => packet[7]) };
  queue = { eventKey, schedule: plan.schedule, nextMatch: plan.nextMatch };
  await native.storage.set(QUEUE_KEY, queue as unknown as JsonValue).catch(() => undefined);
  await remember(source, eventKey, etagKey, etag);
  const { name } = SOURCE_NAMES[source];
  const changes = [plan.add.length && `added ${plan.add.length} match${plan.add.length === 1 ? "" : "es"}`, plan.update.length && `updated ${plan.update.length}`].filter(Boolean).join(" and ");
  report("synced", changes ? `${name} sync ${changes}.` : `Up to date with ${name}.`, eventKey);
}

function canPoll(): boolean {
  return polling && document.visibilityState !== "hidden" && navigator.onLine !== false;
}

function scheduleNext(): void {
  if (timer !== null) window.clearTimeout(timer);
  timer = canPoll() ? window.setTimeout(() => { timer = null; void syncAndContinue(); }, NEXUS_INTERVAL_MS) : null;
}

async function syncAndContinue(): Promise<void> {
  await scheduleSync.syncNow();
  scheduleNext();
}

/** Keeps Our Team's Matches at the Current Event in step with its schedule. */
export const scheduleSync = {
  get manualEventKey(): string | null { return manualEventKey; },
  /** The event Schedule Sync follows: hand-entered, or detected from Nexus or TBA. */
  get currentEvent(): CurrentEvent | null { return currentEvent; },
  get queue(): EventQueue | null { return queue; },
  get dismissed(): DismissedMatches { return dismissed; },
  get lastChange(): { revision: number; ids: readonly string[] } { return lastChange; },

  /** Remembers deleted Synced Matches so sync never adds them again. */
  async dismiss(deleted: readonly MatchPacket[]): Promise<void> {
    dismissed = dismissMatches(dismissed, deleted);
    await native.storage.set(DISMISSED_KEY, dismissed as unknown as JsonValue);
  },

  /** Puts back the hand-entered event key and Dismissed Matches from a Backup. */
  async restoreState(restored: { manualEventKey: string | null; dismissed: DismissedMatches }): Promise<void> {
    dismissed = restored.dismissed;
    queue = null;
    await native.storage.set(DISMISSED_KEY, dismissed as unknown as JsonValue);
    await native.storage.delete(QUEUE_KEY);
    await this.setManualEventKey(restored.manualEventKey);
    void this.syncNow();
  },

  async restore(eventKey: string): Promise<void> {
    dismissed = restoreDismissed(dismissed, eventKey);
    await native.storage.set(DISMISSED_KEY, dismissed as unknown as JsonValue);
    if (eventKey === currentEvent?.eventKey) void this.syncNow();
  },
  get status(): SyncStatus { return status; },

  init(): Promise<void> {
    loading ??= Promise.all([native.storage.get(MANUAL_EVENT_KEY), native.storage.get(BOOKKEEPING_KEY), native.storage.get(QUEUE_KEY), native.storage.get(DISMISSED_KEY)]).then(
      ([stored, kept, queued, deleted]) => {
        dismissed = readDismissedMatches(deleted);
        manualEventKey = typeof stored === "string" && EVENT_KEY.test(stored) ? stored : null;
        bookkeeping = readBookkeeping(kept);
        queue = queued && typeof queued === "object" && !Array.isArray(queued) && typeof queued.eventKey === "string" ? queued as unknown as EventQueue : null;
        status = { ...status, eventKey: bookkeeping.eventKey, source: bookkeeping.source, at: bookkeeping.at };
      },
      () => undefined,
    );
    return loading;
  },

  /** A hand-entered event key always wins; clearing it lets detection take over again. */
  async setManualEventKey(input: string | null): Promise<void> {
    const key = input?.trim().toLowerCase() || null;
    if (key && !EVENT_KEY.test(key)) throw new Error("An event key looks like 2026isde1.");
    manualEventKey = key;
    currentEvent = null;
    detectedAt = 0;
    if (key) await native.storage.set(MANUAL_EVENT_KEY, key);
    else await native.storage.delete(MANUAL_EVENT_KEY);
  },

  syncNow(): Promise<void> {
    running ??= run()
      .catch((error: unknown) => {
        console.error("Schedule Sync failed", error);
        report("error", "Sync failed. Your matches were not changed.", status.eventKey);
      })
      .finally(() => { running = null; });
    return running;
  },

  /**
   * Syncs now and then about every 30 seconds while the board is on screen and online. It pauses in the
   * background and syncs right away on resume and reconnect. Returns a function that stops it.
   */
  start(): () => void {
    if (polling) return () => undefined;
    polling = true;
    const onVisibility = () => { if (document.visibilityState === "visible") void syncAndContinue(); else scheduleNext(); };
    const onOnline = () => void syncAndContinue();
    const onOffline = () => {
      scheduleNext();
      report("offline", "You're offline. Sync resumes when the connection returns.", status.eventKey);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void this.init().then(syncAndContinue);
    return () => {
      polling = false;
      scheduleNext();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  },
};
