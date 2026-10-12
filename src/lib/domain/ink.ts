import { OUR_TEAM, STATIONS, type StationKey } from "./stations";
import { resolveTeamColor, type TeamColorOverrides } from "./team-colors";

// "" for an empty station
export type Lineup = Readonly<Record<StationKey, string>>;

export const NEUTRAL_INK = 0;
// the official app draws any color number outside its palette in white - team ink degrades to neutral there
const TEAM_INK_BASE = 1000;

export function teamInk(station: StationKey): number {
  return TEAM_INK_BASE + STATIONS.indexOf(station);
}

export function inkStation(ink: number): StationKey | null {
  return STATIONS[ink - TEAM_INK_BASE] ?? null;
}

// the official app's palette - strokes stored with these colors keep them and count as neutral ink
const LEGACY_INK_COLORS = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"] as const;

export function officialInkColor(ink: number): string {
  return LEGACY_INK_COLORS[Number.isInteger(ink) && ink >= 0 && ink < LEGACY_INK_COLORS.length ? ink : 0];
}

export function inkColor(ink: number, lineup: Lineup, overrides: TeamColorOverrides): string {
  const station = inkStation(ink);
  if (!station) return officialInkColor(ink);
  const team = lineup[station].trim();
  return team ? resolveTeamColor(team, overrides) : LEGACY_INK_COLORS[NEUTRAL_INK];
}

export function defaultInk(lineup: Lineup): number {
  const ours = STATIONS.find((station) => lineup[station].trim() === OUR_TEAM);
  return ours ? teamInk(ours) : NEUTRAL_INK;
}

export function isStrokeVisible(ink: number, lineup: Lineup, hiddenTeams: ReadonlySet<string>): boolean {
  const station = inkStation(ink);
  const team = station ? lineup[station].trim() : "";
  return !team || !hiddenTeams.has(team);
}

export function isStrokeErasable(ink: number, lineup: Lineup, hiddenTeams: ReadonlySet<string>): boolean {
  return isStrokeVisible(ink, lineup, hiddenTeams);
}
