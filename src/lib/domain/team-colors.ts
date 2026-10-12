import { FALLBACK_TEAM_COLORS, TEAM_COLOR_TABLE } from "./team-color-table";

/** Team number to "#rrggbb" for the teams this device recolors. */
export type TeamColorOverrides = Readonly<Record<string, string>>;

/** Device override first, then the scouting app's table, then its fallback palette by team number. */
export function resolveTeamColor(team: string, overrides: TeamColorOverrides = {}): string {
  const number = Number.parseInt(team.trim(), 10);
  const key = Number.isFinite(number) ? String(number) : team.trim();
  return overrides[key] ?? TEAM_COLOR_TABLE[number] ?? FALLBACK_TEAM_COLORS[Math.abs(number || 0) % FALLBACK_TEAM_COLORS.length];
}
