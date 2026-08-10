import { strokeBounds } from "./geometry";
import type { CheckboxAnnotation, RobotPosition, Stroke, WhiteboardMatch, WhiteboardPhase } from "./types";

/**
 * The renderer intentionally understands the existing positional packet rather
 * than inventing a second persisted board schema. Pass the result to the
 * controller, then call `writeWhiteboardPacket` in its onCommit callback.
 */
export type WhiteboardPacket = readonly unknown[];

const robotKeys = ["redOneRobot", "redTwoRobot", "redThreeRobot", "blueOneRobot", "blueTwoRobot", "blueThreeRobot"] as const;

function number(value: unknown, fallback = 0): number { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function string(value: unknown): string { return typeof value === "string" ? value : ""; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function robot(value: unknown, dimensions: unknown): RobotPosition {
  const pose = array(value); const size = array(dimensions);
  return { x: number(pose[0]), y: number(pose[1]), r: number(pose[2]), w: number(size[0], 152.4), h: number(size[1], 152.4) };
}
function stroke(value: unknown): Stroke | null {
  const source = array(value); if (source.length < 2 || typeof source[0] !== "number") return null;
  const points = source.slice(1).map(array).filter((point) => point.length >= 2).map((point) => [number(point[0]), number(point[1])] as [number, number]);
  return points.length ? [number(source[0]), ...points] : null;
}
function checkbox(value: unknown): CheckboxAnnotation | null {
  const source = array(value); if (source.length < 4) return null;
  return [number(source[0]), number(source[1]), number(source[2]), Boolean(source[3])];
}
function phase(value: unknown, dimensions: unknown[]): WhiteboardPhase {
  const source = array(value);
  const drawing = array(source[6]).map(stroke).filter((entry): entry is Stroke => entry !== null);
  const bboxes = array(source[7]).map(array).filter((entry) => entry.length >= 4).map((entry) => [number(entry[0]), number(entry[1]), number(entry[2]), number(entry[3])] as [number, number, number, number]);
  return {
    redOneRobot: robot(source[0], dimensions[0]), redTwoRobot: robot(source[1], dimensions[1]), redThreeRobot: robot(source[2], dimensions[2]),
    blueOneRobot: robot(source[3], dimensions[3]), blueTwoRobot: robot(source[4], dimensions[4]), blueThreeRobot: robot(source[5], dimensions[5]),
    drawing, drawingBBox: drawing.map((entry, index) => bboxes[index] ?? strokeBounds(entry)),
    checkboxes: array(source[8]).map(checkbox).filter((entry): entry is CheckboxAnnotation => entry !== null),
  };
}

/** Make the canvas's mutable, packet-compatible scene from a native packet. */
export function whiteboardMatchFromPacket(packet: WhiteboardPacket): WhiteboardMatch {
  const body = array(packet[8]); const dimensions = array(body[0]);
  const fieldMetadata = packet[12] && typeof packet[12] === "object" && !Array.isArray(packet[12]) ? packet[12] as { selectedFieldYear?: number | null } : null;
  return {
    id: string(packet[7]), matchName: string(packet[0]), redOne: string(packet[1]), redTwo: string(packet[2]), redThree: string(packet[3]), blueOne: string(packet[4]), blueTwo: string(packet[5]), blueThree: string(packet[6]),
    tbaYear: typeof packet[11] === "number" ? packet[11] : null, fieldMetadata,
    auto: phase(body[1], dimensions), teleop: phase(body[2], dimensions), endgame: phase(body[3], dimensions), notes: phase(body[4], dimensions), transition: phase(body[5], dimensions),
  };
}

function packetPhase(phase: WhiteboardPhase): unknown[] {
  const robots = robotKeys.map((key) => { const robot = phase[key]; return [robot.x, robot.y, Number(robot.r.toFixed(2))]; });
  return [...robots, phase.drawing, phase.drawingBBox, phase.checkboxes];
}

/**
 * Returns a fresh positional packet containing canvas edits. It leaves the
 * source packet untouched, which lets Svelte state retain immutable packet
 * replacements while the canvas has one mutable scene during a gesture.
 */
export function writeWhiteboardPacket<TPacket extends WhiteboardPacket>(source: TPacket, match: WhiteboardMatch): TPacket {
  const packet = structuredClone([...source]);
  const body = array(packet[8]);
  while (body.length < 6) body.push(null);
  body[1] = packetPhase(match.auto); body[2] = packetPhase(match.teleop); body[3] = packetPhase(match.endgame); body[4] = packetPhase(match.notes); body[5] = packetPhase(match.transition);
  packet[8] = body;
  return packet as unknown as TPacket;
}
