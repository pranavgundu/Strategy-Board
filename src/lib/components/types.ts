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

export const emptyMatchForm = (): MatchFormValues => ({
  matchName: "",
  redOne: "",
  redTwo: "",
  redThree: "",
  blueOne: "",
  blueTwo: "",
  blueThree: "",
});
