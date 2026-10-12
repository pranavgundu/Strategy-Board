import { parseNexusEvent, planSync } from "$lib/domain";
import { newId } from "$lib/features/runtime";
import { native } from "$lib/native/api";
import type { JsonValue, SourceResponse } from "$lib/native/types";

import { app } from "./app.svelte";

const MANUAL_EVENT_KEY = "manualEventKey";
const BOOKKEEPING_KEY = "syncBookkeeping";
const EVENT_KEY = /^\d{4}[a-z0-9]+$/;
const NEXUS_INTERVAL_MS = 30_000;

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
interface Bookkeeping {
  etags: Record<string, string>;
  source: SyncSource | null;
  eventKey: string | null;
  at: number | null;
}

let manualEventKey = $state<string | null>(null);
let status = $state<SyncStatus>({ state: "idle", message: "", eventKey: null, source: null, at: null });
let bookkeeping: Bookkeeping = { etags: {}, source: null, eventKey: null, at: null };
let loading: Promise<void> | null = null;
let running: Promise<void> | null = null;
let polling = false;
let timer: number | null = null;

function failureMessage(response: SourceResponse, eventKey: string): string {
  switch (response.kind) {
    case "not-found": return `Nexus has no event called ${eventKey}.`;
    case "missing-key": return "This build has no Nexus API key. Add NEXUS_API_KEY to orbit-strategy-board.env and rebuild.";
    case "rejected-key": return "Nexus rejected this build's API key.";
    case "offline": return "You're offline. Sync resumes when the connection returns.";
    case "unreachable": return `Couldn't reach Nexus (${response.detail}).`;
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

async function run(): Promise<void> {
  const eventKey = manualEventKey;
  if (!eventKey) {
    report("waiting", "Enter the event key in Settings to sync its schedule.", null);
    return;
  }
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
  if (response.kind !== "ok") {
    report(response.kind === "offline" ? "offline" : "error", failureMessage(response, eventKey), eventKey);
    return;
  }
  const schedule = parseNexusEvent(response.data);
  if (!schedule) {
    report("waiting", `Waiting for the ${eventKey} schedule on Nexus.`, eventKey);
    return;
  }
  await app.init();
  const plan = planSync({ packets: app.packets, schedule, newId });
  await app.applySyncPlan(plan);
  await remember("nexus", eventKey, etagKey, response.etag);
  const added = plan.add.length;
  report("synced", added ? `Added ${added} match${added === 1 ? "" : "es"} from Nexus.` : "Up to date with Nexus.", eventKey);
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
  get status(): SyncStatus { return status; },

  init(): Promise<void> {
    loading ??= Promise.all([native.storage.get(MANUAL_EVENT_KEY), native.storage.get(BOOKKEEPING_KEY)]).then(
      ([stored, kept]) => {
        manualEventKey = typeof stored === "string" && EVENT_KEY.test(stored) ? stored : null;
        bookkeeping = readBookkeeping(kept);
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
