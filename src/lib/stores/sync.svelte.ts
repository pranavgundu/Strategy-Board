import { parseNexusEvent, planSync } from "$lib/domain";
import { native } from "$lib/native/api";
import type { SourceResponse } from "$lib/native/types";

import { app } from "./app.svelte";

const MANUAL_EVENT_KEY = "manualEventKey";
const EVENT_KEY = /^\d{4}[a-z0-9]+$/;

export type SyncState = "idle" | "syncing" | "synced" | "waiting" | "error";
export interface SyncStatus {
  state: SyncState;
  message: string;
  /** When the schedule was last read, in ms. */
  at: number | null;
}

let manualEventKey = $state<string | null>(null);
let status = $state<SyncStatus>({ state: "idle", message: "", at: null });
let loading: Promise<void> | null = null;
let running: Promise<void> | null = null;

function newId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

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

async function run(): Promise<void> {
  const eventKey = manualEventKey;
  if (!eventKey) {
    status = { state: "waiting", message: "Enter the event key to sync its schedule.", at: status.at };
    return;
  }
  status = { ...status, state: "syncing" };
  let response: SourceResponse;
  try {
    response = await native.nexus.eventStatus(eventKey);
  } catch {
    status = { state: "error", message: "Schedule Sync isn't available in this build.", at: status.at };
    return;
  }
  if (response.kind !== "ok") {
    status = { state: response.kind === "offline" ? "waiting" : "error", message: failureMessage(response, eventKey), at: status.at };
    return;
  }
  const schedule = parseNexusEvent(response.data);
  if (!schedule) {
    status = { state: "waiting", message: `Waiting for the ${eventKey} schedule on Nexus.`, at: Date.now() };
    return;
  }
  await app.init();
  const plan = planSync({ packets: app.packets, schedule, newId });
  await app.applySyncPlan(plan);
  const added = plan.add.length;
  status = { state: "synced", message: added ? `Added ${added} match${added === 1 ? "" : "es"} from Nexus.` : "Up to date with Nexus.", at: Date.now() };
}

/** Keeps Our Team's Matches at the Current Event in step with its schedule. */
export const scheduleSync = {
  get manualEventKey(): string | null { return manualEventKey; },
  get status(): SyncStatus { return status; },

  init(): Promise<void> {
    loading ??= native.storage.get(MANUAL_EVENT_KEY).then(
      (stored) => { manualEventKey = typeof stored === "string" && EVENT_KEY.test(stored) ? stored : null; },
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
        status = { state: "error", message: "Sync failed. Your matches were not changed.", at: status.at };
      })
      .finally(() => { running = null; });
    return running;
  },
};
