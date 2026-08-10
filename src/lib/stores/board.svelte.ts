import { native } from "$lib/native/api";
import type { BoardMode, BoardState, BoardTool } from "$lib/native/types";

import { toast } from "./toast.svelte";

export type BoardPhase = Exclude<BoardMode, "statbotics">;
export type BoardUiTool = "draw" | "erase" | "move";

const COLOR_NAMES = ["white", "red", "blue", "green", "yellow"] as const;
let state = $state<BoardState>({ mode: "auto", tool: "marker", color: 0, canUndo: false, canRedo: false });
let uiTool = $state<BoardUiTool>("draw");
let initialized = false;
let queue: Promise<void> = Promise.resolve();

function update(next: BoardState): void {
  state = next;
  if (next.tool !== "marker" || uiTool !== "move") uiTool = next.tool === "eraser" ? "erase" : "draw";
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const task = queue.then(operation);
  queue = task.then(() => undefined, () => undefined);
  return task;
}

function report(error: unknown): void {
  console.error("Strategy Board state command failed", error);
  toast.show("Could not update the board controls. Please try again.", "error");
}

/** UI control state only. The canvas owns in-progress drawing and geometry. */
export const board = {
  get mode(): BoardMode { return state.mode; },
  get tool(): BoardUiTool { return uiTool; },
  get color(): string { return COLOR_NAMES[state.color] ?? COLOR_NAMES[0]; },
  get colorIndex(): number { return state.color; },
  get canUndo(): boolean { return state.canUndo; },
  get canRedo(): boolean { return state.canRedo; },

  async init(): Promise<void> {
    if (initialized) return;
    try {
      update(await enqueue(() => native.board.state()));
      initialized = true;
    } catch (error) { report(error); }
  },

  async setMode(mode: BoardMode): Promise<void> {
    try { update(await enqueue(() => native.board.setMode(mode))); } catch (error) { report(error); }
  },

  async setTool(tool: BoardUiTool): Promise<void> {
    if (tool === "move") { uiTool = tool; return; }
    try { update(await enqueue(() => native.board.setTool(tool === "erase" ? "eraser" : "marker"))); } catch (error) { report(error); }
  },

  async setColor(color: string): Promise<void> {
    const index = COLOR_NAMES.indexOf(color.toLowerCase() as typeof COLOR_NAMES[number]);
    if (index === -1) return;
    try { update(await enqueue(() => native.board.setColor(index))); } catch (error) { report(error); }
  },

  /** Call once when a discrete canvas action is committed, never per pointer event. */
  async recordCompletedAction(actionId: string): Promise<void> {
    try { update(await enqueue(() => native.board.recordAction(actionId))); } catch (error) { report(error); }
  },

  async undo(): Promise<string | null> {
    try {
      return await enqueue(async () => {
        const action = await native.board.undo();
        update(await native.board.state());
        return action;
      });
    } catch (error) { report(error); return null; }
  },

  async redo(): Promise<string | null> {
    try {
      return await enqueue(async () => {
        const action = await native.board.redo();
        update(await native.board.state());
        return action;
      });
    } catch (error) { report(error); return null; }
  },
};
