import type { CreateMatchInput, JsonValue, MatchPacket } from "$lib/native/types";

import { fieldLayout } from "./field-layout";
import { STATIONS } from "./stations";

const ROBOT_SIZE = 152.4;

function blankPhase(year?: number): JsonValue[] {
  const { defaults } = fieldLayout(year);
  return [...STATIONS.map((station) => [defaults[station].x, defaults[station].y, 0]), [], [], []];
}

/** A Match with no drawing and every Bumper Sprite at its Station's default position for the field year. */
export function newMatchPacket(input: CreateMatchInput, id: string): MatchPacket {
  if (input.redTeams.length !== 3 || input.blueTeams.length !== 3) throw new Error("A match requires exactly three teams per alliance");
  const dimensions = Array.from({ length: 6 }, () => [ROBOT_SIZE, ROBOT_SIZE]);
  return [
    String(input.matchName), ...input.redTeams.map(String), ...input.blueTeams.map(String), id,
    [dimensions, ...Array.from({ length: 5 }, () => blankPhase(input.tbaYear))],
    input.tbaEventKey ?? null, input.tbaMatchKey ?? null, input.tbaYear ?? null, null,
  ] as unknown as MatchPacket;
}
