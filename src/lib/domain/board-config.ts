import { readChecklist, type ChecklistRow } from "./checklist";
import { readCommonPaths, type CommonPath } from "./common-paths";
import { isObject } from "./json";
import { teamNumberKey } from "./stations";
import type { TeamColorOverrides } from "./team-colors";

/** The device-level setup that travels together between tablets. */
export interface BoardConfig {
  checklist: ChecklistRow[];
  teamColors: TeamColorOverrides;
  commonPaths: CommonPath[];
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function emptyBoardConfig(): BoardConfig {
  return { checklist: [], teamColors: {}, commonPaths: [] };
}

/** Reads a Board Config from storage or a file, keeping only the parts that are valid. */
export function readBoardConfig(value: unknown): BoardConfig {
  const source = isObject(value) ? value : {};
  const teamColors: Record<string, string> = {};
  if (isObject(source.teamColors)) {
    for (const [team, color] of Object.entries(source.teamColors)) {
      const key = teamNumberKey(team);
      if (key && typeof color === "string" && HEX_COLOR.test(color)) teamColors[key] = color.toLowerCase();
    }
  }
  return { checklist: readChecklist(source.checklist), teamColors, commonPaths: readCommonPaths(source.commonPaths) };
}

export function setTeamColorOverride(config: BoardConfig, team: string, color: string): BoardConfig {
  const key = teamNumberKey(team);
  if (!key || !HEX_COLOR.test(color)) throw new Error("A Team Color override needs a team number and a #rrggbb color.");
  return { ...config, teamColors: { ...config.teamColors, [key]: color.toLowerCase() } };
}

export function removeTeamColorOverride(config: BoardConfig, team: string): BoardConfig {
  const key = teamNumberKey(team) ?? team;
  return { ...config, teamColors: Object.fromEntries(Object.entries(config.teamColors).filter(([existing]) => existing !== key)) };
}
