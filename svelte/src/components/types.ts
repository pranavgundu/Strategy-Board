// Shared UI-layer types for the component tree.
// Kept intentionally small and structural (not imported from the legacy
// src/match.ts class) so components stay decoupled from the logic layer.

export interface Match {
  id: string;
  matchName: string;
  redOne: string;
  redTwo: string;
  redThree: string;
  blueOne: string;
  blueTwo: string;
  blueThree: string;
  tbaEventKey?: string;
  tbaMatchKey?: string;
  tbaYear?: number;
  fieldMetadata?: { selectedFieldYear?: number | null };
}

export interface MatchFormValues {
  matchName: string;
  redOne: string;
  redTwo: string;
  redThree: string;
  blueOne: string;
  blueTwo: string;
  blueThree: string;
}

export const emptyMatchForm = (): MatchFormValues => ({
  matchName: "",
  redOne: "",
  redTwo: "",
  redThree: "",
  blueOne: "",
  blueTwo: "",
  blueThree: "",
});

export interface TBAEventOption {
  key: string;
  name: string;
  details: string;
}

export interface TBATeamOption {
  number: string;
  label: string;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  name?: string;
  bio?: string;
}

export interface StatboticsAllianceTeam {
  number: string;
  epa: number;
  auto: number;
  teleop: number;
  endgame: number;
  rank: number;
  percentile: number;
}

export interface StatboticsData {
  lastUpdated?: string;
  redWinProb: number; // 0-100
  blueWinProb: number; // 0-100
  matchResult?: string;
  red: StatboticsAllianceTeam[];
  blue: StatboticsAllianceTeam[];
}
