export type BoardPhase = "auto" | "teleop" | "transition" | "endgame" | "notes";
export type BoardMode = BoardPhase | "statbotics";
export type BoardTool = "draw" | "erase" | "move";

let _mode = $state<BoardMode>("auto");
let _tool = $state<BoardTool>("draw");
let _color = $state<string>("white");
let _canUndo = $state<boolean>(false);

export interface BoardEngine {
  setMode(mode: BoardMode): void;
  setTool(tool: "marker" | "eraser"): void;
  setColor(color: number): void;
  undo(): void;
}

const COLOR_NAMES = ["white", "red", "blue", "green", "yellow"];

function colorIndexOf(c: string): number | undefined {
  const i = COLOR_NAMES.indexOf(c.toLowerCase());
  return i === -1 ? undefined : i;
}

let _engine: BoardEngine | null = null;

type Handler = () => void;
let _undoHandler: Handler | null = null;

export const board = {
  get mode(): BoardMode {
    return _mode;
  },

  get tool(): BoardTool {
    return _tool;
  },

  get color(): string {
    return _color;
  },

  get canUndo(): boolean {
    return _canUndo;
  },

  setMode(m: BoardMode): void {
    _mode = m;
    _engine?.setMode(m);
  },

  setTool(t: BoardTool): void {
    _tool = t;
    if (t === "draw") _engine?.setTool("marker");
    else if (t === "erase") _engine?.setTool("eraser");
  },

  setColor(c: string): void {
    _color = c;
    const index = colorIndexOf(c);
    if (index !== undefined) _engine?.setColor(index);
  },

  undo(): void {
    if (_engine) _engine.undo();
    else _undoHandler?.();
  },

  _bindEngine(engine: BoardEngine | null): void {
    _engine = engine;
  },

  _syncFromEngine(state: {
    mode: BoardMode;
    tool: "marker" | "eraser";
    color: number;
    canUndo: boolean;
  }): void {
    _mode = state.mode;
    _tool = state.tool === "eraser" ? "erase" : "draw";
    _color = COLOR_NAMES[state.color] ?? _color;
    _canUndo = state.canUndo;
  },

  _bind(handlers: { undo?: Handler }): void {
    _undoHandler = handlers.undo ?? null;
  },

  /** Not part of the frozen store contract - lets a bound consumer report
   * live undo-availability into this store's reactive `canUndo`. */
  setCanUndo(v: boolean): void {
    _canUndo = v;
  },
};
