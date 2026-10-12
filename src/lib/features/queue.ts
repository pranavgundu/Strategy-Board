import type { ScheduleInfo } from "$lib/domain";

export type QueueTone = "soon" | "queuing" | "deck" | "field" | "played";
export interface QueueBadge {
  label: string;
  /** The next estimated time worth knowing, like "on deck ~14:12". */
  detail: string | null;
  tone: QueueTone;
}

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const at = (label: string, time: number | undefined) => (time === undefined ? null : `${label} ~${clock.format(time)}`);

/** How Home shows a Synced Match's Queue Status; null when the source reports none. */
export function queueBadge(info: ScheduleInfo | undefined): QueueBadge | null {
  if (!info) return null;
  if (info.played) return { label: "Played", detail: null, tone: "played" };
  const { times } = info;
  switch (info.status) {
    case "Queuing soon": return { label: "Queuing soon", detail: at("queue", times.estimatedQueueTime), tone: "soon" };
    case "Now queuing": return { label: "Now queuing", detail: at("on deck", times.estimatedOnDeckTime), tone: "queuing" };
    case "On deck": return { label: "On deck", detail: at("on field", times.estimatedOnFieldTime), tone: "deck" };
    case "On field": return { label: "On field", detail: at("start", times.estimatedStartTime), tone: "field" };
    default: return info.status ? { label: info.status, detail: null, tone: "soon" } : null;
  }
}
