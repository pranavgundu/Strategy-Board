/** JSON values accepted by the native command boundary. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type Alliance = readonly [string, string, string];
export type BoardMode = "auto" | "teleop" | "transition" | "endgame" | "notes" | "statbotics";
export type BoardTool = "marker" | "eraser";

export interface BoardState {
  mode: BoardMode;
  tool: BoardTool;
  color: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * The persisted and shared match format. It intentionally stays positional so
 * existing local data, QR codes, and cloud links remain compatible.
 */
export type MatchPacket = [
  matchName: string,
  redOne: string,
  redTwo: string,
  redThree: string,
  blueOne: string,
  blueTwo: string,
  blueThree: string,
  id: string,
  body: JsonValue[],
  tbaEventKey?: string | null,
  tbaMatchKey?: string | null,
  tbaYear?: number | null,
  fieldMetadata?: JsonObject | null,
];

/** A convenient read-only projection of a persisted packet for Svelte UI. */
export interface StrategyMatch {
  id: string;
  matchName: string;
  redOne: string;
  redTwo: string;
  redThree: string;
  blueOne: string;
  blueTwo: string;
  blueThree: string;
  tbaMatchKey: string | null;
  red: Alliance;
  blue: Alliance;
  packet: MatchPacket;
  tbaEventKey?: string;
  tbaYear?: number;
  fieldMetadata?: JsonObject;
}

export interface CreateMatchInput {
  matchName: string;
  redTeams: Alliance;
  blueTeams: Alliance;
  tbaEventKey?: string;
  tbaMatchKey?: string;
  tbaYear?: number;
}

export interface TbaAlliance { team_keys: string[]; }
export interface TbaMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: { red: TbaAlliance; blue: TbaAlliance };
}
export interface TbaEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  start_date: string;
  end_date: string;
  year: number;
  city: string | null;
  state_prov: string | null;
  country: string | null;
}
export interface TbaSimpleEvent {
  key: string;
  name: string;
  location: string;
  date_range: string;
  year: number;
}
export interface TbaSimpleMatch {
  match_name: string;
  red_teams: string[];
  blue_teams: string[];
  match_key: string;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  name: string | null;
  bio: string | null;
}

export interface QrReceivingProgress {
  status: "receiving";
  received: number;
  total: number;
  duplicate: boolean;
}
export interface QrCompleteProgress { status: "complete"; payload: string; }
export type QrProgress = QrReceivingProgress | QrCompleteProgress;

export interface FuzzyMatchResult { score: number; matchedIndices: number[]; }
/** Native batch-search schema. Pre-normalizing once keeps large match lists fast. */
export interface FuzzyBatchItem {
  name: string;
  nameLower: string;
  details: string;
  detailsLower: string;
  key: string;
  keyLower: string;
}
export interface FuzzyBatchMatch { index: number; score: number; matchedIndices: number[]; }

export interface FieldPoint { x: number; y: number; }
export interface FieldRobotPositions {
  red: { one: FieldPoint; two: FieldPoint; three: FieldPoint };
  blue: { one: FieldPoint; two: FieldPoint; three: FieldPoint };
}

export interface PdfTextPlan {
  value: string;
  xMm: number;
  yMm: number;
  fontSizePt: number;
  bold: boolean;
}
export interface PdfQrPlan {
  payload: string;
  ordinal: number;
  total: number;
  xMm: number;
  yMm: number;
  sizeMm: number;
  label: PdfTextPlan | null;
}
export interface PdfPagePlan { pageIndex: number; texts: PdfTextPlan[]; qrCodes: PdfQrPlan[]; }
export interface PdfDocumentPlan { widthMm: number; heightMm: number; pages: PdfPagePlan[]; }

export interface ReleaseAnnouncement {
  enabled: boolean;
  id: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  showOnce: boolean;
}
export interface NativeConfig {
  fieldPngPixelWidth: number;
  fieldPngPixelHeight: number;
  fieldRealWidthInches: number;
  fieldRealHeightInches: number;
  redOneStationX: number;
  redOneStationY: number;
  redTwoStationX: number;
  redTwoStationY: number;
  redThreeStationX: number;
  redThreeStationY: number;
  blueOneStationX: number;
  blueOneStationY: number;
  blueTwoStationX: number;
  blueTwoStationY: number;
  blueThreeStationX: number;
  blueThreeStationY: number;
  /** Never render this value or expose it beyond the native call boundary. */
  sharedTbaApiKey: string | null;
  releaseAnnouncement: ReleaseAnnouncement;
}

export interface StatboticsMatch {
  key: string;
  year: number;
  event: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  match_name: string;
  time: number | null;
  status: string | null;
  pred: JsonObject | null;
  result: JsonObject | null;
}
export interface StatboticsYear { year: number; percentiles: JsonObject | null; }
export interface StatboticsTeamYear {
  team: number;
  year: number;
  name: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  rookie_year: number | null;
  epa: JsonObject | null;
  record: JsonObject | null;
  district_points: number | null;
  district_rank: number | null;
}
