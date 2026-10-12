import type { MatchPacket } from "$lib/native/types";

import { readBoardConfig, type BoardConfig } from "./board-config";
import { toWhatIfMatch } from "./extras";
import { isObject } from "./json";
import { readDismissedMatches, type DismissedMatches } from "./sync";

const MATCH_FILE = "orbit-strategy-board/match";
const BOARD_CONFIG_FILE = "orbit-strategy-board/board-config";
const BACKUP_FILE = "orbit-strategy-board/backup";
const FILE_VERSION = 1;
const EVENT_KEY = /^\d{4}[a-z0-9]+$/;

export interface Backup {
  packets: MatchPacket[];
  config: BoardConfig;
  manualEventKey: string | null;
  dismissed: DismissedMatches;
}

export type BoardFile =
  | { kind: "match"; packet: MatchPacket }
  | { kind: "board-config"; config: BoardConfig }
  | { kind: "backup"; backup: Backup };

export class BoardFileError extends Error {
  override name = "BoardFileError";
}

// clears the local id like a qr export does - an import always becomes a new match
function portablePacket(packet: readonly unknown[]): MatchPacket {
  const copy = structuredClone([...packet]) as unknown as MatchPacket;
  copy[7] = null as unknown as string;
  return copy;
}

function isMatchPacket(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length >= 9 && value.slice(0, 7).every((entry) => typeof entry === "string") && Array.isArray(value[8]);
}

function matchPacketFrom(value: unknown): MatchPacket {
  if (!isMatchPacket(value)) throw new BoardFileError("This Match File is damaged.");
  return toWhatIfMatch(portablePacket(value));
}

function backupFrom(file: Record<string, unknown>): Backup {
  const { packets, config, manualEventKey, dismissed } = file;
  if (!Array.isArray(packets) || !packets.every(isMatchPacket) || !isObject(config)) throw new BoardFileError("This Backup is damaged.");
  return {
    packets: structuredClone(packets) as unknown as MatchPacket[],
    config: readBoardConfig(config),
    manualEventKey: typeof manualEventKey === "string" && EVENT_KEY.test(manualEventKey) ? manualEventKey : null,
    dismissed: readDismissedMatches(dismissed),
  };
}

export function encodeMatchFile(packet: MatchPacket): string {
  return JSON.stringify({ type: MATCH_FILE, version: FILE_VERSION, packet: portablePacket(packet) });
}

export function encodeBoardConfigFile(config: BoardConfig): string {
  return JSON.stringify({ type: BOARD_CONFIG_FILE, version: FILE_VERSION, config });
}

export function encodeBackup(backup: Backup): string {
  return JSON.stringify({ type: BACKUP_FILE, version: FILE_VERSION, ...backup });
}

export function readBoardFile(text: string): BoardFile {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (!isObject(parsed) || typeof parsed.type !== "string") throw new BoardFileError("This isn't an Orbit Strategy Board file.");
  if (parsed.version !== FILE_VERSION) throw new BoardFileError("This file was saved in a format this board can't read.");
  if (parsed.type === MATCH_FILE) return { kind: "match", packet: matchPacketFrom(parsed.packet) };
  if (parsed.type === BOARD_CONFIG_FILE) {
    if (!isObject(parsed.config)) throw new BoardFileError("This Board Config file is damaged.");
    return { kind: "board-config", config: readBoardConfig(parsed.config) };
  }
  if (parsed.type === BACKUP_FILE) return { kind: "backup", backup: backupFrom(parsed) };
  throw new BoardFileError("This isn't an Orbit Strategy Board file.");
}
