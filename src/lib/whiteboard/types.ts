import type { BoundingBox, Point } from "./geometry";

export const FIELD_WIDTH = 3510;
export const FIELD_HEIGHT = 1610;
export const MAX_HISTORY = 100;

export type WhiteboardMode = "auto" | "teleop" | "transition" | "endgame" | "notes" | "statbotics";
export type WhiteboardTool = "marker" | "eraser" | "checkbox";
export type BoardPhaseName = Exclude<WhiteboardMode, "statbotics">;
export type Stroke = [color: number, ...points: [number, number][]];
export type CheckboxAnnotation = [x: number, y: number, color: number, checked: boolean];

export interface RobotPosition { x: number; y: number; w: number; h: number; r: number }
export interface WhiteboardPhase {
  redOneRobot: RobotPosition; redTwoRobot: RobotPosition; redThreeRobot: RobotPosition;
  blueOneRobot: RobotPosition; blueTwoRobot: RobotPosition; blueThreeRobot: RobotPosition;
  drawing: Stroke[]; drawingBBox: BoundingBox[]; checkboxes: CheckboxAnnotation[];
}
export interface WhiteboardMatch {
  id: string;
  matchName?: string;
  redOne: string; redTwo: string; redThree: string;
  blueOne: string; blueTwo: string; blueThree: string;
  tbaYear?: number | null;
  fieldMetadata?: { selectedFieldYear?: number | null } | null;
  auto: WhiteboardPhase; teleop: WhiteboardPhase; transition: WhiteboardPhase; endgame: WhiteboardPhase; notes: WhiteboardPhase;
}
export interface WhiteboardRefs {
  container: HTMLElement;
  background: HTMLCanvasElement;
  items: HTMLCanvasElement;
  drawing: HTMLCanvasElement;
}
export interface WhiteboardState {
  mode: WhiteboardMode; tool: WhiteboardTool; color: number;
  view: "full" | "red" | "blue"; canUndo: boolean; canRedo: boolean;
  isCanvasVisible: boolean;
}
export interface WhiteboardCommit {
  match: WhiteboardMatch;
  mode: BoardPhaseName;
  reason: "stroke" | "erase" | "checkbox" | "transform" | "undo" | "redo";
}
export interface WhiteboardControllerOptions {
  /** URLs by field year. The newest available artwork is used as fallback. */
  fieldImages?: Readonly<Record<number, string>>;
  onStateChange?: (state: WhiteboardState) => void;
  /** Called once after a completed local transaction; use this to persist the packet. */
  onCommit?: (commit: WhiteboardCommit) => void | Promise<void>;
}
