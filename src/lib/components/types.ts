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
  next?: boolean;
  queue?: QueueBadge | null;
};

export type MatchFormValues = Omit<Match, "id" | "tbaMatchKey" | "next" | "queue">;

export type MatchGroup = {
  key: string;
  eventKey: string | null;
  title: string;
  current: boolean;
  collapsed: boolean;
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
