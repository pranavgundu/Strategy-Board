import { afterEach, describe, expect, it, vi } from "vitest";
import { WhiteboardController, whiteboardMatchFromPacket, strokeBounds, type Stroke } from "../src/lib/whiteboard";
import { createBrowserMatchPacket } from "../src/lib/native/web";

class Canvas extends EventTarget {
  style = {};
  width = 3510;
  height = 1610;
  getContext() {
    return new Proxy({}, { get: () => () => {}, set: () => true });
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 3510, height: 1610 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
}

function setup() {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const drawing = new Canvas();
  const commits = vi.fn();
  const controller = new WhiteboardController({ onCommit: commits });
  controller.mount({
    container: { clientWidth: 3510, clientHeight: 1610 },
    background: new Canvas(), items: new Canvas(), drawing,
  } as unknown as Parameters<WhiteboardController["mount"]>[0]);
  const match = whiteboardMatchFromPacket(createBrowserMatchPacket({
    matchName: "test", redTeams: ["1", "2", "3"], blueTeams: ["4", "5", "6"],
  }, "test"));
  controller.setMatch(match);
  function pointer(type: string, x: number, y: number, id = 1) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { clientX: x, clientY: y, pointerId: id, pointerType: "touch", button: 0 });
    drawing.dispatchEvent(event);
  }
  return { controller, match, commits, pointer };
}

afterEach(() => vi.unstubAllGlobals());

describe("whiteboard gesture boundaries", () => {
  it("ignores a second finger instead of discarding the active stroke", () => {
    const { controller, match, pointer, commits } = setup();
    pointer("pointerdown", 400, 400);
    pointer("pointermove", 500, 500);
    pointer("pointerdown", 1000, 1000, 2);
    pointer("pointerup", 1000, 1000, 2);
    pointer("pointerup", 500, 500);
    expect(match.auto.drawing).toEqual([[0, [400, 400], [500, 500]]]);
    expect(commits).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it("commits to the original phase when the mode changes mid-gesture", () => {
    const { controller, match, pointer, commits } = setup();
    pointer("pointerdown", 400, 400);
    pointer("pointermove", 500, 500);
    controller.setMode("teleop");
    pointer("pointerup", 500, 500);
    expect(match.auto.drawing).toHaveLength(1);
    expect(match.teleop.drawing).toHaveLength(0);
    expect(commits.mock.calls[0][0].mode).toBe("auto");
    controller.setMode("auto");
    controller.undo();
    expect(match.auto.drawing).toHaveLength(0);
    controller.destroy();
  });

  it("flushes the current gesture before the exit flow waits for persistence", () => {
    const { controller, match, pointer, commits } = setup();
    pointer("pointerdown", 400, 400);
    pointer("pointermove", 500, 500);
    controller.flushPendingGesture();
    expect(match.auto.drawing).toEqual([[0, [400, 400], [500, 500]]]);
    expect(commits).toHaveBeenCalledTimes(1);
    // A late pointer-up or unmount must not save the same gesture twice.
    pointer("pointerup", 500, 500);
    controller.destroy();
    expect(commits).toHaveBeenCalledTimes(1);
  });

  it("saves a robot drag when the board is unmounted before pointer-up", () => {
    const { controller, match, pointer, commits } = setup();
    const robot = match.auto.redOneRobot;
    pointer("pointerdown", robot.x, robot.y);
    pointer("pointermove", robot.x + 100, robot.y + 50);
    controller.destroy();
    expect(commits).toHaveBeenCalledTimes(1);
    expect(commits.mock.calls[0][0].reason).toBe("transform");
  });

  it("restores stroke order after erasing in multiple pointer moves", () => {
    const { controller, match, pointer } = setup();
    const strokes: Stroke[] = [
      [0, [400, 400]], [1, [600, 400]], [2, [800, 400]], [3, [1000, 400]],
    ];
    match.auto.drawing = structuredClone(strokes);
    match.auto.drawingBBox = strokes.map(strokeBounds);
    controller.setTool("eraser");
    pointer("pointerdown", 600, 400); // Removes index 1.
    pointer("pointermove", 1000, 400); // Removes indices 2, 1 of the remaining list.
    pointer("pointerup", 1000, 400);
    expect(match.auto.drawing).toEqual([strokes[0]]);
    controller.undo();
    expect(match.auto.drawing).toEqual(strokes);
    controller.redo();
    expect(match.auto.drawing).toEqual([strokes[0]]);
    controller.destroy();
  });
});
