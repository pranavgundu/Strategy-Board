import { beforeEach, describe, expect, it, vi } from "vitest";

function makeCanvas(id: string, width = 3510, height = 1610): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.width = width;
  canvas.height = height;
  canvas.getContext = (() => ({}) as any) as any;
  return canvas;
}

describe("whiteboard DOM/canvas orchestration", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  async function loadUpdateCanvasSize(): Promise<() => void> {
    const mod = await import("../src/whiteboard.ts");
    return mod.updateCanvasSize;
  }

  it("does not throw when wrapper is missing", async () => {
    const updateCanvasSize = await loadUpdateCanvasSize();
    expect(() => updateCanvasSize()).not.toThrow();
  });

  it("applies scale and positions all canvas layers consistently", async () => {
    const updateCanvasSize = await loadUpdateCanvasSize();

    const wrapper = document.createElement("div");
    wrapper.id = "whiteboard-wrapper";
    Object.defineProperty(wrapper, "clientWidth", { value: 1000, configurable: true });
    Object.defineProperty(wrapper, "clientHeight", { value: 600, configurable: true });

    const bg = makeCanvas("whiteboard-canvas-background");
    const items = makeCanvas("whiteboard-canvas-items");
    const drawing = makeCanvas("whiteboard-canvas-drawing");

    document.body.appendChild(wrapper);
    document.body.appendChild(bg);
    document.body.appendChild(items);
    document.body.appendChild(drawing);

    updateCanvasSize();

    expect(bg.style.scale).not.toBe("");
    expect(items.style.scale).toBe(bg.style.scale);
    expect(drawing.style.scale).toBe(bg.style.scale);

    expect(bg.style.left).toBe(items.style.left);
    expect(bg.style.left).toBe(drawing.style.left);

    expect(bg.style.top).toBe(items.style.top);
    expect(bg.style.top).toBe(drawing.style.top);

    expect(bg.style.transformOrigin).toBe("top left");
    expect(items.style.transformOrigin).toBe("top left");
    expect(drawing.style.transformOrigin).toBe("top left");
  });

  it("recomputes layer layout on resize and orientation change", async () => {
    const updateCanvasSize = await loadUpdateCanvasSize();

    const wrapper = document.createElement("div");
    wrapper.id = "whiteboard-wrapper";

    let width = 1000;
    let height = 600;
    Object.defineProperty(wrapper, "clientWidth", {
      get: () => width,
      configurable: true,
    });
    Object.defineProperty(wrapper, "clientHeight", {
      get: () => height,
      configurable: true,
    });

    const bg = makeCanvas("whiteboard-canvas-background");
    const items = makeCanvas("whiteboard-canvas-items");
    const drawing = makeCanvas("whiteboard-canvas-drawing");

    document.body.appendChild(wrapper);
    document.body.appendChild(bg);
    document.body.appendChild(items);
    document.body.appendChild(drawing);

    updateCanvasSize();
    const initialScale = bg.style.scale;

    width = 1800;
    height = 700;
    window.dispatchEvent(new Event("resize"));
    const resizedScale = bg.style.scale;

    width = 800;
    height = 1200;
    window.dispatchEvent(new Event("orientationchange"));
    const rotatedScale = bg.style.scale;

    expect(resizedScale).not.toBe(initialScale);
    expect(rotatedScale).not.toBe(resizedScale);

    expect(items.style.scale).toBe(bg.style.scale);
    expect(drawing.style.scale).toBe(bg.style.scale);
    expect(items.style.left).toBe(bg.style.left);
    expect(drawing.style.left).toBe(bg.style.left);
    expect(items.style.top).toBe(bg.style.top);
    expect(drawing.style.top).toBe(bg.style.top);
  });
});
