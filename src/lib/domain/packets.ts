import type { CreateMatchInput, JsonValue, MatchPacket } from "$lib/native/types";

import { fieldLayout } from "./field-layout";
import { STATIONS } from "./stations";

const ROBOT_SIZE = 152.4;

export type MatchPhase = "auto" | "teleop" | "transition" | "endgame" | "notes";
// the official app fixes this order in the packet body
export const PHASE_INDEX: Readonly<Record<MatchPhase, number>> = { auto: 1, teleop: 2, endgame: 3, notes: 4, transition: 5 };

export function phaseName(phase: MatchPhase, fieldYear: number): string {
  if (phase === "teleop") return fieldYear >= 2026 ? "Active" : "Teleop";
  if (phase === "endgame") return fieldYear >= 2026 ? "Inactive" : "Endgame";
  return { auto: "Auto", transition: "Transition", notes: "Notes" }[phase];
}

function blankPhase(year?: number): JsonValue[] {
  const { spriteStarts } = fieldLayout(year);
  return [...STATIONS.map((station) => [spriteStarts[station].x, spriteStarts[station].y, 0]), [], [], []];
}

export function newMatchPacket(input: CreateMatchInput, id: string): MatchPacket {
  if (input.redTeams.length !== 3 || input.blueTeams.length !== 3) throw new Error("A match requires exactly three teams per alliance");
  const dimensions = Array.from({ length: 6 }, () => [ROBOT_SIZE, ROBOT_SIZE]);
  return [
    String(input.matchName), ...input.redTeams.map(String), ...input.blueTeams.map(String), id,
    [dimensions, ...Array.from({ length: 5 }, () => blankPhase(input.tbaYear))],
    input.tbaEventKey ?? null, input.tbaMatchKey ?? null, input.tbaYear ?? null, null,
  ] as unknown as MatchPacket;
}
