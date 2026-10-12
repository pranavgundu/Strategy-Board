import type { JsonValue, MatchPacket } from "$lib/native/types";
import { strokeBounds } from "$lib/whiteboard/geometry";
import { FIELD_HEIGHT, FIELD_WIDTH } from "$lib/whiteboard/types";

import type { BoardConfig } from "./board-config";
import { matchFieldYear } from "./field-layout";
import { teamInk, type Lineup } from "./ink";
import { isObject } from "./json";
import { PHASE_INDEX, type MatchPhase } from "./packets";
import { STATIONS, stationAlliance, teamNumberKey, type AllianceColor, type StationKey } from "./stations";

export interface CommonPathPose { x: number; y: number; r: number }
/** One robot's Strokes from one Phase plus its Bumper Sprite pose, saved to paste into other Matches. */
export interface CommonPath {
  id: string;
  name: string;
  /** The team the path was drawn for, or null when any robot can run it. */
  tag: string | null;
  fieldYear: number;
  phase: MatchPhase;
  alliance: AllianceColor;
  /** Each Stroke's points in field coordinates. */
  strokes: [number, number][][];
  pose: CommonPathPose;
}

function phaseOf(packet: MatchPacket, phase: MatchPhase): unknown[] {
  const source = packet[8][PHASE_INDEX[phase]];
  return Array.isArray(source) ? source : [];
}

function points(stroke: unknown[]): [number, number][] {
  return stroke.slice(1).filter(Array.isArray).map((point) => [Number(point[0]), Number(point[1])]);
}

export function saveCommonPath(packet: MatchPacket, station: StationKey, phase: MatchPhase, details: { id: string; name: string; tag: string | null }): CommonPath {
  const name = details.name.trim();
  if (!name) throw new Error("A Common Path needs a name.");
  const source = phaseOf(packet, phase);
  const ink = teamInk(station);
  const drawing = Array.isArray(source[6]) ? source[6] : [];
  const robot = Array.isArray(source[STATIONS.indexOf(station)]) ? (source[STATIONS.indexOf(station)] as unknown[]) : [];
  return {
    id: details.id,
    name,
    tag: details.tag,
    fieldYear: matchFieldYear(packet),
    phase,
    alliance: stationAlliance(station),
    strokes: drawing.filter((stroke): stroke is unknown[] => Array.isArray(stroke) && stroke[0] === ink).map(points),
    pose: { x: Number(robot[0] ?? 0), y: Number(robot[1] ?? 0), r: Number(robot[2] ?? 0) },
  };
}

export type PastedStroke = [ink: number, ...points: [number, number][]];
export interface CommonPathPaste { strokes: PastedStroke[]; pose: CommonPathPose }

/** What a Common Path puts into a Station: fresh copies in its Team Ink that keep no link back to the library. */
export function commonPathPaste(path: CommonPath, station: StationKey): CommonPathPaste {
  const turned = stationAlliance(station) !== path.alliance;
  const place = ([x, y]: [number, number]): [number, number] => (turned ? [FIELD_WIDTH - x, FIELD_HEIGHT - y] : [x, y]);
  const [x, y] = place([path.pose.x, path.pose.y]);
  const ink = teamInk(station);
  return {
    strokes: path.strokes.map((stroke): PastedStroke => [ink, ...stroke.map(place)]),
    // sprite rotation is stored relative to each alliance's wall, so turning the pose half a turn keeps its r
    pose: { x, y, r: path.pose.r },
  };
}

export function applyCommonPath(packet: MatchPacket, path: CommonPath, station: StationKey, phase: MatchPhase): MatchPacket {
  const copy = structuredClone(packet);
  const target = copy[8][PHASE_INDEX[phase]];
  if (!Array.isArray(target)) throw new Error(`This Match has no ${phase} drawing`);
  const paste = commonPathPaste(path, station);
  const drawing = Array.isArray(target[6]) ? target[6] : [];
  const bounds = Array.isArray(target[7]) && target[7].length === drawing.length ? target[7] : drawing.map((stroke) => strokeBounds(stroke as PastedStroke) as JsonValue);
  target[6] = [...drawing, ...paste.strokes];
  target[7] = [...bounds, ...paste.strokes.map((stroke) => strokeBounds(stroke))];
  target[STATIONS.indexOf(station)] = [paste.pose.x, paste.pose.y, paste.pose.r];
  return copy;
}

export interface CommonPathChoice {
  path: CommonPath;
  /** The tagged team's Station when that team plays in the Match. */
  station: StationKey | null;
}

/**
 * The paths the apply picker offers for a Match: only its field year, paths saved from the Phase on screen first,
 * and within each of those, paths tagged with a team in the Match first.
 */
export function commonPathChoices(paths: readonly CommonPath[], { fieldYear, phase, lineup }: { fieldYear: number; phase: MatchPhase; lineup: Lineup }): CommonPathChoice[] {
  const stationOf = (tag: string | null) => (tag ? STATIONS.find((station) => lineup[station].trim() === tag) ?? null : null);
  return paths
    .filter((path) => path.fieldYear === fieldYear)
    .map((path) => ({ path, station: stationOf(path.tag) }))
    .sort((a, b) => rank(a, phase) - rank(b, phase) || a.path.name.localeCompare(b.path.name));
}

function rank({ path, station }: CommonPathChoice, phase: MatchPhase): number {
  return (path.phase === phase ? 0 : 2) + (station ? 0 : 1);
}

export function addCommonPath(config: BoardConfig, path: CommonPath): BoardConfig {
  return { ...config, commonPaths: [...config.commonPaths, structuredClone(path)] };
}

function updatePath(config: BoardConfig, id: string, change: Partial<CommonPath>): BoardConfig {
  return { ...config, commonPaths: config.commonPaths.map((path) => (path.id === id ? { ...path, ...change } : path)) };
}

export function renameCommonPath(config: BoardConfig, id: string, name: string): BoardConfig {
  return updatePath(config, id, { name });
}

/** Tags a path with a team number, or with null when any robot can run it. */
export function retagCommonPath(config: BoardConfig, id: string, tag: string | null): BoardConfig {
  const key = tag === null ? null : teamNumberKey(tag);
  if (tag !== null && !key) throw new Error("A Common Path is tagged with a team number or with any robot.");
  return updatePath(config, id, { tag: key });
}

/** Pasted copies keep no link to the library, so Matches never change when a path is deleted. */
export function deleteCommonPath(config: BoardConfig, id: string): BoardConfig {
  return { ...config, commonPaths: config.commonPaths.filter((path) => path.id !== id) };
}

function point(value: unknown): [number, number] | null {
  return Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number" ? [value[0], value[1]] : null;
}

function commonPath(value: unknown): CommonPath | null {
  if (!isObject(value) || !isObject(value.pose) || !Array.isArray(value.strokes)) return null;
  const { id, name, tag, fieldYear, phase, alliance, pose } = value;
  if (typeof id !== "string" || !id || typeof name !== "string" || (tag !== null && typeof tag !== "string") || typeof fieldYear !== "number") return null;
  if (!(typeof phase === "string" && phase in PHASE_INDEX) || (alliance !== "red" && alliance !== "blue")) return null;
  if (typeof pose.x !== "number" || typeof pose.y !== "number" || typeof pose.r !== "number") return null;
  const strokes = value.strokes.map((stroke) => (Array.isArray(stroke) ? stroke.map(point) : [null]));
  if (strokes.some((stroke) => !stroke.length || stroke.includes(null))) return null;
  return { id, name, tag, fieldYear, phase: phase as MatchPhase, alliance, strokes: strokes as [number, number][][], pose: { x: pose.x, y: pose.y, r: pose.r } };
}

/** Keeps the valid Common Paths from storage or a file; a repeated id keeps only its first path. */
export function readCommonPaths(value: unknown): CommonPath[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.map(commonPath).filter((path): path is CommonPath => {
    if (!path || seen.has(path.id)) return false;
    seen.add(path.id);
    return true;
  });
}
