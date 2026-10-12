import type { QueueBadge } from "$lib/features/queue";

export type Match = {
  id: string;
  matchName: string;
  redOne: string;
  redTwo: string;
  redThree: string;
  blueOne: string;
  blueTwo: string;
  blueThree: string;
  tbaMatchKey?: string | null;
  /** Pinned at the top as Our Team's Next Match. */
  next?: boolean;
  queue?: QueueBadge | null;
};

export type MatchFormValues = Omit<Match, "id" | "tbaMatchKey" | "next" | "queue">;

/** One event's Matches on Home, or the What-if Matches made with New when eventKey is null. */
export type MatchGroup = {
  key: string;
  eventKey: string | null;
  title: string;
  current: boolean;
  collapsed: boolean;
  /** Deleted Synced Matches of this event that sync is skipping. */
  dismissedCount: number;
  matches: Match[];
};

export const emptyMatchForm = (): MatchFormValues => ({
  matchName: "",
  redOne: "",
  redTwo: "",
  redThree: "",
  blueOne: "",
  blueTwo: "",
  blueThree: "",
});
