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
};

export type MatchFormValues = Omit<Match, "id" | "tbaMatchKey">;

export const emptyMatchForm = (): MatchFormValues => ({
  matchName: "",
  redOne: "",
  redTwo: "",
  redThree: "",
  blueOne: "",
  blueTwo: "",
  blueThree: "",
});
