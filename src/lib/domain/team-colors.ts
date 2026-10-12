import { FALLBACK_TEAM_COLORS, TEAM_COLOR_TABLE } from "./team-color-table";

// team number to "#rrggbb"
export type TeamColorOverrides = Readonly<Record<string, string>>;

export function resolveTeamColor(team: string, overrides: TeamColorOverrides = {}): string {
  const number = Number.parseInt(team.trim(), 10);
  const key = Number.isFinite(number) ? String(number) : team.trim();
  return overrides[key] ?? TEAM_COLOR_TABLE[number] ?? FALLBACK_TEAM_COLORS[Math.abs(number || 0) % FALLBACK_TEAM_COLORS.length];
}
