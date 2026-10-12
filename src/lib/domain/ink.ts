import { OUR_TEAM, STATIONS, type StationKey } from "./stations";
import { resolveTeamColor, type TeamColorOverrides } from "./team-colors";

/** The team in each Station of a Match, "" for an empty Station. */
export type Lineup = Readonly<Record<StationKey, string>>;

export const NEUTRAL_INK = 0;
// the official app draws any color number outside its palette in white, so Team Ink degrades to Neutral there
const TEAM_INK_BASE = 1000;

export function teamInk(station: StationKey): number {
  return TEAM_INK_BASE + STATIONS.indexOf(station);
}

/** The Station a Stroke's Ink belongs to, or null for Neutral Ink (including the legacy colors). */
export function inkStation(ink: number): StationKey | null {
  return STATIONS[ink - TEAM_INK_BASE] ?? null;
}

/** The official app's stroke palette. Strokes stored with these colors keep them and count as Neutral Ink. */
const LEGACY_INK_COLORS = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"] as const;

/** How the official app colors a Stroke: any number outside its palette is white. */
export function officialInkColor(ink: number): string {
  return LEGACY_INK_COLORS[Number.isInteger(ink) && ink >= 0 && ink < LEGACY_INK_COLORS.length ? ink : 0];
}

/** The color a Stroke is drawn in on this board. */
export function inkColor(ink: number, lineup: Lineup, overrides: TeamColorOverrides): string {
  const station = inkStation(ink);
  if (!station) return officialInkColor(ink);
  const team = lineup[station].trim();
  return team ? resolveTeamColor(team, overrides) : LEGACY_INK_COLORS[NEUTRAL_INK];
}

/** The Ink a Match opens with: Our Team's Station when 1690 plays in it, otherwise Neutral. */
export function defaultInk(lineup: Lineup): number {
  const ours = STATIONS.find((station) => lineup[station].trim() === OUR_TEAM);
  return ours ? teamInk(ours) : NEUTRAL_INK;
}
