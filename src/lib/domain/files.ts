import type { MatchPacket } from "$lib/native/types";

import { toWhatIfMatch } from "./extras";

const MATCH_FILE = "orbit-strategy-board/match";
const FILE_VERSION = 1;

export type BoardFile = { kind: "match"; packet: MatchPacket };

export class BoardFileError extends Error {
  override name = "BoardFileError";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Clears the local id like a QR export does, so an import always becomes a new Match. */
function portablePacket(packet: readonly unknown[]): MatchPacket {
  const copy = structuredClone([...packet]) as unknown as MatchPacket;
  copy[7] = null as unknown as string;
  return copy;
}

function matchPacketFrom(value: unknown): MatchPacket {
  if (!Array.isArray(value) || value.length < 9 || !value.slice(0, 7).every((entry) => typeof entry === "string") || !Array.isArray(value[8])) {
    throw new BoardFileError("This Match File is damaged.");
  }
  return toWhatIfMatch(portablePacket(value));
}

export function encodeMatchFile(packet: MatchPacket): string {
  return JSON.stringify({ type: MATCH_FILE, version: FILE_VERSION, packet: portablePacket(packet) });
}

/** Reads any file the board saves, recognizing it by its type tag. */
export function readBoardFile(text: string): BoardFile {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (!isObject(parsed) || typeof parsed.type !== "string") throw new BoardFileError("This isn't an Orbit Strategy Board file.");
  if (parsed.version !== FILE_VERSION) throw new BoardFileError("This file was saved in a format this board can't read.");
  if (parsed.type === MATCH_FILE) return { kind: "match", packet: matchPacketFrom(parsed.packet) };
  throw new BoardFileError("This isn't an Orbit Strategy Board file.");
}
