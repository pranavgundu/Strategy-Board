import { beforeEach, describe, expect, it, vi } from "vitest";

function makeCanvas(id: string, width = 3510, height = 1610): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.width = width;
  canvas.height = height;
  const props: Record<string, unknown> = {};
  const ctx: any = new Proxy(props, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "measureText") return () => ({ width: 0 });
      if (prop === "getImageData")
        return () => ({ data: new Uint8ClampedArray(4) });
      if (prop === "createLinearGradient" || prop === "createPattern")
        return () => ({ addColorStop: () => {} });
      return () => {};
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  });
  canvas.getContext = (() => ctx) as any;
  return canvas;
}

function buildLegacyToolbar(): void {
  const wrapper = document.createElement("div");
  wrapper.id = "whiteboard-wrapper";
  document.body.appendChild(wrapper);

  document.body.appendChild(makeCanvas("whiteboard-canvas-background"));
  document.body.appendChild(makeCanvas("whiteboard-canvas-items"));
  document.body.appendChild(makeCanvas("whiteboard-canvas-drawing"));

  const ids = [
    "whiteboard-toolbar-undo",
    "whiteboard-toolbar-redo",
    "whiteboard-toolbar-mode-auto",
    "whiteboard-toolbar-mode-teleop",
    "whiteboard-toolbar-mode-transition",
    "whiteboard-toolbar-mode-endgame",
    "whiteboard-toolbar-mode-notes",
    "whiteboard-toolbar-mode-statbotics",
    "whiteboard-draw-config",
    "whiteboard-draw-config-marker",
    "whiteboard-draw-config-eraser",
    "whiteboard-draw-config-checkbox",
    "whiteboard-draw-config-text",
    "whiteboard-color-config",
    "whiteboard-color-white",
    "whiteboard-color-red",
    "whiteboard-color-blue",
    "whiteboard-color-green",
    "whiteboard-color-yellow",
    "whiteboard-color-close",
    "whiteboard-number-pad",
  ];
  for (const id of ids) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
}

async function makeWhiteboard(options?: { bindLegacyDOM?: boolean }) {
  const mod = await import("../src/whiteboard.ts");
  const model = { updateMatch: vi.fn() } as any;
  return new mod.Whiteboard(model, options ?? {});
}

describe("Whiteboard public API", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    buildLegacyToolbar();
  });

  it("binds the legacy toolbar by default", async () => {
    const wb = await makeWhiteboard();

    expect(wb.getMode()).toBe("auto");

    document.getElementById("whiteboard-toolbar-mode-teleop")!.click();
    expect(wb.getMode()).toBe("teleop");

    document.getElementById("whiteboard-toolbar-mode-transition")!.click();
    expect(wb.getMode()).toBe("transition");
  });

  it("does not bind the legacy toolbar when opted out", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    document.getElementById("whiteboard-toolbar-mode-teleop")!.click();
    expect(wb.getMode()).toBe("auto");
  });

  it("drives mode through the API when the toolbar is not bound", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    wb.setMode("endgame");
    expect(wb.getMode()).toBe("endgame");

    wb.setMode("statbotics");
    expect(wb.getMode()).toBe("statbotics");
  });

  it("exposes and updates the stroke color", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    expect(wb.getColor()).toBe(0);
    wb.setColor(3);
    expect(wb.getColor()).toBe(3);
  });

  it("ignores out-of-range colors", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    wb.setColor(9);
    expect(wb.getColor()).toBe(0);
    wb.setColor(-1);
    expect(wb.getColor()).toBe(0);
  });

  it("reports undo/redo availability", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    expect(wb.canUndo()).toBe(false);
    expect(wb.canRedo()).toBe(false);
  });

  it("emits current state to a new onChange listener and on updates", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    const seen: any[] = [];
    const unsubscribe = wb.onChange((s) => seen.push(s));

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ mode: "auto", color: 0, canUndo: false });

    wb.setMode("notes");
    expect(seen.at(-1)).toMatchObject({ mode: "notes" });

    wb.setColor(2);
    expect(seen.at(-1)).toMatchObject({ color: 2 });

    unsubscribe();
    const countAfterUnsubscribe = seen.length;
    wb.setMode("auto");
    expect(seen).toHaveLength(countAfterUnsubscribe);
  });

  it("survives a listener that throws", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });
    vi.spyOn(console, "error").mockImplementation(() => {});

    wb.onChange(() => {
      throw new Error("listener boom");
    });
    const seen: any[] = [];
    wb.onChange((s) => seen.push(s));

    expect(() => wb.setMode("teleop")).not.toThrow();
    expect(seen.at(-1)).toMatchObject({ mode: "teleop" });
  });

  it("getState reflects mode, tool and color together", async () => {
    const wb = await makeWhiteboard({ bindLegacyDOM: false });

    wb.setMode("endgame");
    wb.setColor(4);

    expect(wb.getState()).toMatchObject({
      mode: "endgame",
      color: 4,
      tool: "marker",
      canUndo: false,
      canRedo: false,
    });
  });
});
