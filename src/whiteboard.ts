import { Match } from "@/match.ts";
import { Model } from "@/model.ts";
import { Config } from "@/config.ts";
import fieldUrl from "./images/field25.png";

let _backgroundEl: HTMLCanvasElement | null = null;
let _itemsEl: HTMLCanvasElement | null = null;
let _drawingEl: HTMLCanvasElement | null = null;

let _BGctx: CanvasRenderingContext2D | null = null;
let _ITctx: CanvasRenderingContext2D | null = null;
let _DRctx: CanvasRenderingContext2D | null = null;

function ensureCanvases(): void {
  if (!_backgroundEl) {
    _backgroundEl = document.getElementById(
      "whiteboard-canvas-background",
    ) as HTMLCanvasElement | null;
  }
  if (!_itemsEl) {
    _itemsEl = document.getElementById(
      "whiteboard-canvas-items",
    ) as HTMLCanvasElement | null;
  }
  if (!_drawingEl) {
    _drawingEl = document.getElementById(
      "whiteboard-canvas-drawing",
    ) as HTMLCanvasElement | null;
  }

  if (_backgroundEl) {
    const ctx = _backgroundEl.getContext("2d");
    if (ctx) _BGctx = ctx;
  }
  if (_itemsEl) {
    const ctx = _itemsEl.getContext("2d");
    if (ctx) _ITctx = ctx;
  }
  if (_drawingEl) {
    const ctx = _drawingEl.getContext("2d");
    if (ctx) _DRctx = ctx;
  }

  if (!_BGctx) {
    const c = document.createElement("canvas");
    c.width = Config.fieldPNGPixelWidth;
    c.height = Config.fieldPNGPixelHeight;
    _BGctx = c.getContext("2d");
  }
  if (!_ITctx) {
    const c = document.createElement("canvas");
    c.width = Config.fieldPNGPixelWidth;
    c.height = Config.fieldPNGPixelHeight;
    _ITctx = c.getContext("2d");
  }
  if (!_DRctx) {
    const c = document.createElement("canvas");
    c.width = Config.fieldPNGPixelWidth;
    c.height = Config.fieldPNGPixelHeight;
    _DRctx = c.getContext("2d");
  }
}

const _canvasStub = (() => {
  const c = document.createElement("canvas");
  c.width = Config.fieldPNGPixelWidth;
  c.height = Config.fieldPNGPixelHeight;
  return c;
})();

const background = new Proxy({} as HTMLCanvasElement, {
  get(_t, prop: PropertyKey, receiver?: any) {
    ensureCanvases();
    const el = _backgroundEl || _canvasStub;
    const value = (el as any)[prop];
    if (typeof value === "function") return value.bind(el);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, receiver?: any) {
    ensureCanvases();
    if (_backgroundEl) (_backgroundEl as any)[prop] = val;
    return true;
  },
}) as unknown as HTMLCanvasElement;

const items = new Proxy({} as HTMLCanvasElement, {
  get(_t, prop: PropertyKey, receiver?: any) {
    ensureCanvases();
    const el = _itemsEl || _canvasStub;
    const value = (el as any)[prop];
    if (typeof value === "function") return value.bind(el);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, receiver?: any) {
    ensureCanvases();
    if (_itemsEl) (_itemsEl as any)[prop] = val;
    return true;
  },
}) as unknown as HTMLCanvasElement;

const drawing = new Proxy({} as HTMLCanvasElement, {
  get(_t, prop: PropertyKey, receiver?: any) {
    ensureCanvases();
    const el = _drawingEl || _canvasStub;
    const value = (el as any)[prop];
    if (typeof value === "function") return value.bind(el);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, receiver?: any) {
    ensureCanvases();
    if (_drawingEl) (_drawingEl as any)[prop] = val;
    return true;
  },
}) as unknown as HTMLCanvasElement;

const BG = new Proxy({} as CanvasRenderingContext2D, {
  get(_t, prop: PropertyKey, receiver?: any) {
    ensureCanvases();
    const ctx = _BGctx as any;
    const value = ctx[prop];
    if (typeof value === "function") return value.bind(ctx);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, receiver?: any) {
    ensureCanvases();
    const ctx = _BGctx as any;
    if (ctx) {
      try {
        ctx[prop as any] = val;
      } catch (err) {}
    }
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const IT = new Proxy({} as CanvasRenderingContext2D, {
  get(_t, prop: PropertyKey, receiver?: any) {
    ensureCanvases();
    const ctx = _ITctx as any;
    const value = ctx[prop];
    if (typeof value === "function") return value.bind(ctx);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, receiver?: any) {
    ensureCanvases();
    const ctx = _ITctx as any;
    if (ctx) {
      try {
        ctx[prop as any] = val;
      } catch (err) {}
    }
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const DR = new Proxy({} as CanvasRenderingContext2D, {
  get(_t, prop: PropertyKey, receiver?: any) {
    ensureCanvases();
    const ctx = _DRctx as any;
    const value = ctx[prop];
    if (typeof value === "function") return value.bind(ctx);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, receiver?: any) {
    ensureCanvases();
    const ctx = _DRctx as any;
    if (ctx) {
      try {
        ctx[prop as any] = val;
      } catch (err) {}
    }
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const dpr = window.devicePixelRatio || 1;
const width = Config.fieldPNGPixelWidth;
const height = Config.fieldPNGPixelHeight;
const realWidth = Config.fieldRealWidthInches;
const realHeight = Config.fieldRealHeightInches;

let scaling = 1;

const fieldImage = new Image();
fieldImage.src = fieldUrl;

export function updateCanvasSize() {
  const wrapper = <HTMLElement>document.getElementById("whiteboard-wrapper");
  if (!wrapper) return;

  const fillWidth = wrapper.clientWidth;
  const fillHeight = wrapper.clientHeight;

  const ratioWidth = fillWidth / background.width;
  const ratioHeight = fillHeight / background.height;

  // Apply zoom factor to add padding (0.95 = 5% padding on each side)
  scaling = Math.min(ratioWidth, ratioHeight) * 0.95;
  
  const scaledWidth = background.width * scaling;
  const scaledHeight = background.height * scaling;
  
  const leftOffset = (fillWidth - scaledWidth) / 2;
  const topOffset = (fillHeight - scaledHeight) / 2;
  
  [background, items, drawing].forEach((e) => {
    e.style.scale = `${scaling}`;
    e.style.left = `${leftOffset}px`;
    e.style.top = `${topOffset}px`;
    e.style.transformOrigin = 'top left';
  });
}

window.addEventListener("resize", updateCanvasSize);
window.addEventListener("orientationchange", updateCanvasSize);

let clickMovement = 0;

export class Whiteboard {
  private model;
  private active = true;
  private match: Match | null = null;
  private mode = "auto";
  private currentView = "full";
  private camera = {
    x: width / 2,
    y: height / 2,
  };

  private selected: any = null;
  private selectedType: string = "";
  private lastSelected: any = null;
  private rotControl: { x: number; y: number } | null = null;
  private isPointerDown = false;

  private currentStrokePoints: Array<any> = [];
  private currentErasePoint: { x: number; y: number } | null = null;
  private lastErasePoint: { x: number; y: number } | null = null;
  private currentErasedStrokes: any = [];
  private currentErasedStrokeIndexes: any = [];
  private previousRobotTransform: any = {};
  private currentAction = "none";
  private currentTool = "marker";
  private currentColor = 0;
  private currentTextValue = "";

  private autoActionHistory: Array<any> = [];
  private teleopActionHistory: Array<any> = [];
  private endgameActionHistory: Array<any> = [];
  private notesActionHistory: Array<any> = [];

  private autoRedoHistory: Array<any> = [];
  private teleopRedoHistory: Array<any> = [];
  private endgameRedoHistory: Array<any> = [];
  private notesRedoHistory: Array<any> = [];

  static camera_presets: { [key: string]: { x: number; y: number } } = {
    full: { x: width / 2, y: height / 2 },
    red: { x: (3 * width) / 4, y: height / 2 },
    blue: { x: width / 4, y: height / 2 },
  };

  constructor(model: Model) {
    this.model = model;

    fieldImage.onload = () => this.drawBackground();

    window.addEventListener("resize", this.redrawAll.bind(this));
    window.addEventListener("orientationchange", this.redrawAll.bind(this));
    window.addEventListener("keydown", (e) => {
      // Support both Cmd (Mac) and Ctrl (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      // Undo: Cmd+Z or Ctrl+Z
      if (modifier && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      // Redo: Cmd+Shift+Z or Ctrl+Shift+Z or Cmd+Y or Ctrl+Y
      else if (modifier && (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      }
    });
    drawing.addEventListener("click", (e) => this.onClick(e));
    drawing.addEventListener("pointermove", this.onPointerMove.bind(this));
    drawing.addEventListener("pointerup", this.onPointerUp.bind(this));
    drawing.addEventListener("pointerdown", this.onPointerDown.bind(this));
    drawing.addEventListener("pointerleave", this.onPointerLeave.bind(this));

    // Add click handler for undo button
    document
      .getElementById("whiteboard-toolbar-undo")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.undo();
      });

    document
      .getElementById("whiteboard-toolbar-mode-auto")
      ?.addEventListener("click", (e) => this.toggleMode("auto"));
    document
      .getElementById("whiteboard-toolbar-mode-teleop")
      ?.addEventListener("click", (e) => this.toggleMode("teleop"));
    document
      .getElementById("whiteboard-toolbar-mode-endgame")
      ?.addEventListener("click", (e) => this.toggleMode("endgame"));
    document
      .getElementById("whiteboard-toolbar-mode-notes")
      ?.addEventListener("click", (e) => this.toggleMode("notes"));
    document
      .getElementById("whiteboard-draw-config")
      ?.addEventListener("click", (e) => {
        if (this.currentTool == "marker") {
          this.currentTool = "eraser";
          document
            .getElementById("whiteboard-draw-config-marker")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-draw-config-eraser")
            ?.style.setProperty("display", "inline");
          document
            .getElementById("whiteboard-draw-config-text")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-number-pad")
            ?.classList.add("hidden");
        } else if (this.currentTool == "eraser") {
          this.currentTool = "text";
          document
            .getElementById("whiteboard-draw-config-marker")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-draw-config-eraser")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-draw-config-text")
            ?.style.setProperty("display", "inline");
          document
            .getElementById("whiteboard-number-pad")
            ?.classList.remove("hidden");
        } else if (this.currentTool == "text") {
          this.currentTool = "marker";
          document
            .getElementById("whiteboard-draw-config-marker")
            ?.style.setProperty("display", "inline");
          document
            .getElementById("whiteboard-draw-config-eraser")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-draw-config-text")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-number-pad")
            ?.classList.add("hidden");
        }
      });

    for (let i = 0; i <= 9; i++) {
      const btn = document.getElementById(`whiteboard-number-${i}`);
      btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentTool = "text";
        this.currentTextValue = String(i);

        document
          .getElementById("whiteboard-number-pad")
          ?.classList.remove("hidden");

        for (let k = 0; k <= 9; k++) {
          document
            .getElementById(`whiteboard-number-${k}`)
            ?.classList.remove("ring-2", "ring-amber-400");
        }
        try {
          (e.currentTarget as HTMLElement).classList.add(
            "ring-2",
            "ring-amber-400",
          );
        } catch (err) {}
      });
    }

    document
      .getElementById("whiteboard-number-close")
      ?.addEventListener("click", (e) => {
        e.stopPropagation();

        this.currentTextValue = "";

        this.currentTool = "marker";

        document
          .getElementById("whiteboard-draw-config-marker")
          ?.style.setProperty("display", "inline");
        document
          .getElementById("whiteboard-draw-config-eraser")
          ?.style.setProperty("display", "none");
        document
          .getElementById("whiteboard-draw-config-text")
          ?.style.setProperty("display", "none");

        document
          .getElementById("whiteboard-number-pad")
          ?.classList.add("hidden");

        for (let k = 0; k <= 9; k++) {
          document
            .getElementById(`whiteboard-number-${k}`)
            ?.classList.remove("ring-2", "ring-amber-400");
        }
      });

    const widthConfig = <HTMLInputElement>(
      document.getElementById("whiteboard-robot-config-width")
    );
    widthConfig.addEventListener("input", (e) => {
      if (this.selected !== null) {
        let robotWidth = Number(widthConfig.value);
        if (Number.isNaN(robotWidth) || robotWidth > 100 || robotWidth < 5) {
          robotWidth = 30;
        }
        if (this.match === null) return;
        this.match.auto[`${this.selected[0]}Robot`].w =
          (robotWidth * width) / realWidth;
        this.match.teleop[`${this.selected[0]}Robot`].w =
          (robotWidth * width) / realWidth;
        this.match.endgame[`${this.selected[0]}Robot`].w =
          (robotWidth * width) / realWidth;
        this.drawRobots();
      }
    });

    const heightConfig = <HTMLInputElement>(
      document.getElementById("whiteboard-robot-config-height")
    );
    heightConfig.addEventListener("input", (e) => {
      if (this.selected !== null) {
        let robotHeight = Number(heightConfig.value);
        if (Number.isNaN(robotHeight) || robotHeight > 100 || robotHeight < 5) {
          robotHeight = 30;
        }
        if (this.match === null) return;
        this.match.auto[`${this.selected[0]}Robot`].h =
          (robotHeight * height) / realHeight;
        this.match.teleop[`${this.selected[0]}Robot`].h =
          (robotHeight * height) / realHeight;
        this.match.endgame[`${this.selected[0]}Robot`].h =
          (robotHeight * height) / realHeight;
        this.drawRobots();
      }
    });

    document
      .getElementById("whiteboard-toolbar-undo")
      ?.addEventListener("click", (e) => {
        this.undo();
      });

    document
      .getElementById("whiteboard-color-close")
      ?.addEventListener("click", (e) => {
        document
          .getElementById("whiteboard-color-config")
          ?.classList.add("color-picker-hidden");

        setTimeout(() => {
          document
            .getElementById("whiteboard-color-white")
            ?.classList.add("hidden");
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.add("hidden");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.add("hidden");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.add("hidden");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.add("hidden");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-close")
            ?.classList.add("hidden");
          switch (this.currentColor) {
            case 0: {
              document
                .getElementById("whiteboard-color-white")
                ?.classList.remove("hidden");
              break;
            }
            case 1: {
              document
                .getElementById("whiteboard-color-red")
                ?.classList.remove("hidden");
              break;
            }
            case 2: {
              document
                .getElementById("whiteboard-color-blue")
                ?.classList.remove("hidden");
              break;
            }
            case 3: {
              document
                .getElementById("whiteboard-color-green")
                ?.classList.remove("hidden");
              break;
            }
            case 4: {
              document
                .getElementById("whiteboard-color-yellow")
                ?.classList.remove("hidden");
              break;
            }
            default:
              break;
          }

          document
            .getElementById("whiteboard-color-config")
            ?.classList.remove("color-picker-hidden");
        }, 300);
      });

    document
      .getElementById("whiteboard-color-white")
      ?.addEventListener("click", (e) => {
        if (
          document
            .getElementById("whiteboard-color-close")
            ?.classList.contains("hidden")
        ) {
          document
            .getElementById("whiteboard-color-white")
            ?.classList.add("border-4");
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-close")
            ?.classList.remove("hidden");
        } else {
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("border-4");
          this.currentColor = 0;
          document
            .getElementById("whiteboard-color-white")
            ?.classList.add("border-4");
        }
      });

    document
      .getElementById("whiteboard-color-red")
      ?.addEventListener("click", (e) => {
        if (
          document
            .getElementById("whiteboard-color-close")
            ?.classList.contains("hidden")
        ) {
          document
            .getElementById("whiteboard-color-red")
            ?.classList.add("border-4");
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-close")
            ?.classList.remove("hidden");
        } else {
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("border-4");
          this.currentColor = 1;
          document
            .getElementById("whiteboard-color-red")
            ?.classList.add("border-4");
        }
      });

    document
      .getElementById("whiteboard-color-blue")
      ?.addEventListener("click", (e) => {
        if (
          document
            .getElementById("whiteboard-color-close")
            ?.classList.contains("hidden")
        ) {
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.add("border-4");
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-close")
            ?.classList.remove("hidden");
        } else {
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("border-4");
          this.currentColor = 2;
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.add("border-4");
        }
      });

    document
      .getElementById("whiteboard-color-green")
      ?.addEventListener("click", (e) => {
        if (
          document
            .getElementById("whiteboard-color-close")
            ?.classList.contains("hidden")
        ) {
          document
            .getElementById("whiteboard-color-green")
            ?.classList.add("border-4");
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-close")
            ?.classList.remove("hidden");
        } else {
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("border-4");
          this.currentColor = 3;
          document
            .getElementById("whiteboard-color-green")
            ?.classList.add("border-4");
        }
      });

    document
      .getElementById("whiteboard-color-yellow")
      ?.addEventListener("click", (e) => {
        if (
          document
            .getElementById("whiteboard-color-close")
            ?.classList.contains("hidden")
        ) {
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.add("border-4");
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.remove("hidden");
          document
            .getElementById("whiteboard-color-close")
            ?.classList.remove("hidden");
        } else {
          document
            .getElementById("whiteboard-color-white")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-red")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-blue")
            ?.classList.remove("border-4");
          document
            .getElementById("whiteboard-color-green")
            ?.classList.remove("border-4");
          this.currentColor = 4;
          document
            .getElementById("whiteboard-color-yellow")
            ?.classList.add("border-4");
        }
      });

    DR.lineWidth = 10;
    DR.lineCap = "round";
    DR.lineJoin = "round";
    DR.strokeStyle = "white";

    requestAnimationFrame(this.main.bind(this));

    setInterval(() => {
      if (this.match !== null) {
        this.model.updateMatch(this.match.id);
      }
    }, 3000);
  }

  public setActive(active: boolean) {
    this.active = active;
    if (active == true) {
      if (this.getCurrentUndoHistory().length < 1) {
        document
          .getElementById("whiteboard-toolbar-undo")
          ?.style.setProperty("opacity", "0.5");
        document
          .getElementById("whiteboard-toolbar-undo")
          ?.style.setProperty("cursor", "not-allowed");
      } else {
        document
          .getElementById("whiteboard-toolbar-undo")
          ?.style.setProperty("opacity", "1");
        document
          .getElementById("whiteboard-toolbar-undo")
          ?.style.setProperty("cursor", "pointer");
      }
      this.currentTool = "marker";
      this.currentColor = 0;
      document
        .getElementById("whiteboard-draw-config-marker")
        .style.setProperty("display", "inline");
      document
        .getElementById("whiteboard-draw-config-eraser")
        .style.setProperty("display", "none");

      document
        .getElementById("whiteboard-color-white")
        ?.classList.remove("hidden");
      document
        .getElementById("whiteboard-color-white")
        ?.classList.remove("border-4");
      document.getElementById("whiteboard-color-red")?.classList.add("hidden");
      document
        .getElementById("whiteboard-color-red")
        ?.classList.remove("border-4");
      document.getElementById("whiteboard-color-blue")?.classList.add("hidden");
      document
        .getElementById("whiteboard-color-blue")
        ?.classList.remove("border-4");
      document
        .getElementById("whiteboard-color-green")
        ?.classList.add("hidden");
      document
        .getElementById("whiteboard-color-green")
        ?.classList.remove("border-4");
      document
        .getElementById("whiteboard-color-yellow")
        ?.classList.add("hidden");
      document
        .getElementById("whiteboard-color-yellow")
        ?.classList.remove("border-4");
      document
        .getElementById("whiteboard-color-close")
        ?.classList.add("hidden");
    } else if (active == false) {
      if (this.match !== null) this.model.updateMatch(this.match.id);
      this.match = null;
      this.lastSelected = null;
      this.selected = null;
      this.autoActionHistory = [];
      this.teleopActionHistory = [];
      this.endgameActionHistory = [];
      this.notesActionHistory = [];
      this.autoRedoHistory = [];
      this.teleopRedoHistory = [];
      this.endgameRedoHistory = [];
      this.notesRedoHistory = [];
      document
        .getElementById("whiteboard-robot-config")
        ?.classList.add("hidden");
    }
  }

  public setMatch(match: Match) {
    this.match = match;
    this.redrawAll();
    // Update undo/redo button states when a new match is loaded
    this.updateUndoRedoButtons();
  }

  public toggleView() {
    if (this.currentView == "full") {
      this.currentView = "red";
    } else if (this.currentView == "red") {
      this.currentView = "blue";
    } else if (this.currentView == "blue") {
      this.currentView = "full";
    }
    this.camera = Whiteboard.camera_presets[this.currentView];
    this.redrawAll();
  }

  private addUndoHistory(action: any) {
    // Clear redo history when a new action is performed
    this.clearCurrentRedoHistory();
    
    if (this.mode === "auto") {
      this.autoActionHistory.push(action);
    }
    if (this.mode === "teleop") {
      this.teleopActionHistory.push(action);
    }
    if (this.mode === "endgame") {
      this.endgameActionHistory.push(action);
    }
    if (this.mode === "notes") {
      this.notesActionHistory.push(action);
    }

    this.updateUndoRedoButtons();
  }

  private clearCurrentRedoHistory() {
    if (this.mode === "auto") {
      this.autoRedoHistory = [];
    }
    if (this.mode === "teleop") {
      this.teleopRedoHistory = [];
    }
    if (this.mode === "endgame") {
      this.endgameRedoHistory = [];
    }
    if (this.mode === "notes") {
      this.notesRedoHistory = [];
    }
  }

  private getCurrentRedoHistory() {
    if (this.mode === "auto") {
      return this.autoRedoHistory;
    }
    if (this.mode === "teleop") {
      return this.teleopRedoHistory;
    }
    if (this.mode === "endgame") {
      return this.endgameRedoHistory;
    }
    if (this.mode === "notes") {
      return this.notesRedoHistory;
    }

    return [];
  }

  private updateUndoRedoButtons() {
    const undoHistory = this.getCurrentUndoHistory();
    const redoHistory = this.getCurrentRedoHistory();
    
    // Update undo button
    const undoBtn = document.getElementById("whiteboard-toolbar-undo");
    if (undoBtn) {
      if (undoHistory.length > 0) {
        undoBtn.style.opacity = "1";
        undoBtn.style.cursor = "pointer";
      } else {
        undoBtn.style.opacity = "0.5";
        undoBtn.style.cursor = "not-allowed";
      }
    }
    
    // Update redo button
    const redoBtn = document.getElementById("whiteboard-toolbar-redo");
    if (redoBtn) {
      if (redoHistory.length > 0) {
        redoBtn.style.opacity = "1";
        redoBtn.style.cursor = "pointer";
      } else {
        redoBtn.style.opacity = "0.5";
        redoBtn.style.cursor = "not-allowed";
      }
    }
  }

  private getCurrentUndoHistory() {
    if (this.mode === "auto") {
      return this.autoActionHistory;
    }
    if (this.mode === "teleop") {
      return this.teleopActionHistory;
    }
    if (this.mode === "endgame") {
      return this.endgameActionHistory;
    }
    if (this.mode === "notes") {
      return this.notesActionHistory;
    }

    return [];
  }

  private undo() {
    const history = this.getCurrentUndoHistory();
    if (history.length < 1) return;

    const action = history.pop();
    
    // Add to redo history
    const redoHistory = this.getCurrentRedoHistory();
    redoHistory.push(action);
    
    if (action.type == "stroke") {
      const data = this.getData();
      if (data !== null) {
        const index = data.drawing.indexOf(action.ref);
        if (index !== -1) {
          data.drawing.splice(index, 1);
          data.drawingBBox.splice(index, 1);
          this.redrawDrawing();
        }
      }
    } else if (action.type == "transform") {
      const data = this.getData();
      if (data !== null) {
        const robot = data[`${action.slot}Robot`];
        if (action.prev.x != undefined) robot.x = action.prev.x;
        if (action.prev.y != undefined) robot.y = action.prev.y;
        if (action.prev.r != undefined) robot.r = action.prev.r;
        this.drawRobots();
      }
    } else if (action.type == "erase") {
      const data = this.getData();
      if (data !== null) {
        for (let i = action.erased.length - 1; i >= 0; i--) {
          this.getData()?.drawing.splice(
            action.indexes[i],
            0,
            action.erased[i],
          );
          this.getData()?.drawingBBox.splice(
            action.indexes[i],
            0,
            getBBox(action.erased[i]) as any,
          );
        }
        this.redrawDrawing();
      }
    } else if (action.type === "text") {
      const data = this.getData();
      if (data !== null) {
        if (action.ref) {
          const ref = action.ref as any[];
          const idx = data.textAnnotations.findIndex(
            (t: any) =>
              t[0] === ref[0] &&
              t[1] === ref[1] &&
              t[2] === ref[2] &&
              String(t[3]) === String(ref[3]),
          );
          if (idx !== -1) {
            data.textAnnotations.splice(idx, 1);
          } else {
            data.textAnnotations.pop();
          }
        } else {
          data.textAnnotations.pop();
        }
        this.redrawDrawing();
      }
    }

    this.updateUndoRedoButtons();
  }

  private redo() {
    const redoHistory = this.getCurrentRedoHistory();
    if (redoHistory.length < 1) return;

    const action = redoHistory.pop();
    
    // Add back to undo history
    const undoHistory = this.getCurrentUndoHistory();
    undoHistory.push(action);
    
    if (action.type == "stroke") {
      const data = this.getData();
      if (data !== null) {
        data.drawing.push(action.ref);
        data.drawingBBox.push(getBBox(action.ref) as any);
        this.redrawDrawing();
      }
    } else if (action.type == "transform") {
      const data = this.getData();
      if (data !== null) {
        const robot = data[`${action.slot}Robot`];
        if (action.new.x != undefined) robot.x = action.new.x;
        if (action.new.y != undefined) robot.y = action.new.y;
        if (action.new.r != undefined) robot.r = action.new.r;
        this.drawRobots();
      }
    } else if (action.type == "erase") {
      const data = this.getData();
      if (data !== null) {
        // Re-apply the erase by removing the strokes in reverse order
        for (let i = 0; i < action.indexes.length; i++) {
          const idx = action.indexes[i];
          // Find the stroke in the current drawing array
          const currentIdx = data.drawing.findIndex((s: any) => s === action.erased[i]);
          if (currentIdx !== -1) {
            data.drawing.splice(currentIdx, 1);
            data.drawingBBox.splice(currentIdx, 1);
          }
        }
        this.redrawDrawing();
      }
    } else if (action.type === "text") {
      const data = this.getData();
      if (data !== null) {
        if (action.ref) {
          data.textAnnotations.push(action.ref);
        }
        this.redrawDrawing();
      }
    }

    this.updateUndoRedoButtons();
  }

  private drawBackground() {
    BG.save();
    BG.clearRect(0, 0, width, height);

    if (this.mode === "notes") {
      BG.fillStyle = "#000000";
      BG.fillRect(0, 0, width, height);

      BG.strokeStyle = "rgba(255, 255, 255, 0.2)";
      BG.lineWidth = 1;

      const gridSpacing = 100;

      for (let x = 0; x < width; x += gridSpacing) {
        BG.beginPath();
        BG.moveTo(x, 0);
        BG.lineTo(x, height);
        BG.stroke();
      }

      for (let y = 0; y < height; y += gridSpacing) {
        BG.beginPath();
        BG.moveTo(0, y);
        BG.lineTo(width, y);
        BG.stroke();
      }

      BG.restore();
      return;
    }

    BG.fillStyle = "#18181b";
    BG.fillRect(0, 0, width, height);
    BG.translate(width / 2 - this.camera.x, height / 2 - this.camera.y);
    BG.drawImage(fieldImage, 0, 0);

    BG.restore();

    if (this.match == null) return;

    BG.font = "bold 64px sans-serif";
    BG.fillStyle = "white";
    BG.textAlign = "center";
    BG.textBaseline = "middle";

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(v, hi));

    const margin = 96;

    const drawStation = (
      stationX: number,
      stationY: number,
      text: string,
      rotation: number,
    ) => {
      const px = stationX - (this.camera.x - width / 2);
      const py = stationY - (this.camera.y - height / 2);

      const effectiveMarginX = margin;
      const effectiveMarginY = margin;

      const cx = clamp(px, effectiveMarginX, width - effectiveMarginX);
      const cy = clamp(py, effectiveMarginY, height - effectiveMarginY);

      BG.save();
      BG.translate(cx, cy);
      BG.rotate(rotation);
      BG.fillText(text, 0, 0);
      BG.restore();
    };

    drawStation(
      Config.redOneStationX,
      Config.redOneStationY,
      this.match.redOne,
      Math.PI / 2,
    );
    drawStation(
      Config.redTwoStationX,
      Config.redTwoStationY,
      this.match.redTwo,
      Math.PI / 2,
    );
    drawStation(
      Config.redThreeStationX,
      Config.redThreeStationY,
      this.match.redThree,
      Math.PI / 2,
    );
    drawStation(
      Config.blueOneStationX,
      Config.blueOneStationY,
      this.match.blueOne,
      Math.PI / 2,
    );
    drawStation(
      Config.blueTwoStationX,
      Config.blueTwoStationY,
      this.match.blueTwo,
      Math.PI / 2,
    );
    drawStation(
      Config.blueThreeStationX,
      Config.blueThreeStationY,
      this.match.blueThree,
      Math.PI / 2,
    );
  }

  private drawRobot(name: string, robot: any, team: string, slot: string) {
    const isSelected = this.selected !== null && this.selected[0] == slot;

    if (team === "red") {
      IT.fillStyle = "red";
    } else {
      IT.fillStyle = "blue";
    }

    IT.beginPath();
    IT.save();
    IT.translate(
      robot.x - (this.camera.x - width / 2),
      robot.y - (this.camera.y - height / 2),
    );
    IT.rotate(robot.r);
    IT.roundRect(-robot.w / 2, -robot.h / 2, robot.w, robot.h, 20);
    if (isSelected) {
      IT.shadowBlur = 30;
      IT.shadowColor = "white";
    }
    IT.fill();
    if (isSelected) {
      IT.shadowBlur = 0;
    }
    IT.beginPath();
    IT.fillStyle = "#242429";
    IT.roundRect(
      -robot.w / 2 + 17,
      -robot.h / 2 + 17,
      robot.w - 34,
      robot.h - 34,
      10,
    );
    IT.fill();

    IT.font = "bold 48px sans-serif";
    IT.fillStyle = "white";
    IT.textAlign = "center";
    IT.textBaseline = "middle";
    IT.fillText(name, 0, 0);

    if (this.selected !== null && this.selected[0] == slot) {
      IT.beginPath();
      IT.fillStyle = "white";
      const rotControlX = team === "blue" ? -robot.w / 2 : robot.w / 2;
      IT.arc(rotControlX, 0, 20, 0, Math.PI * 2);
      IT.fill();
    }

    IT.restore();
  }

  private getData() {
    if (this.match === null) return null;
    if (this.mode === "auto") {
      return this.match.auto;
    }
    if (this.mode === "teleop") {
      return this.match.teleop;
    }
    if (this.mode === "endgame") {
      return this.match.endgame;
    }
    if (this.mode === "notes") {
      return this.match.notes;
    }
    return null;
  }

  private drawRobots() {
    const data = this.getData();

    if (data === null || this.match === null) return;

    if (this.mode === "notes") {
      IT.clearRect(0, 0, width, height);
      return;
    }

    IT.clearRect(0, 0, width, height);
    this.drawRobot(this.match.redOne, data.redOneRobot, "red", "redOne");
    this.drawRobot(this.match.redTwo, data.redTwoRobot, "red", "redTwo");
    this.drawRobot(this.match.redThree, data.redThreeRobot, "red", "redThree");
    this.drawRobot(this.match.blueOne, data.blueOneRobot, "blue", "blueOne");
    this.drawRobot(this.match.blueTwo, data.blueTwoRobot, "blue", "blueTwo");
    this.drawRobot(
      this.match.blueThree,
      data.blueThreeRobot,
      "blue",
      "blueThree",
    );
  }

  private redrawDrawing() {
    const data = this.getData();

    if (data === null || this.match === null) return;

    DR.clearRect(0, 0, width, height);
    DR.lineWidth = 10;
    DR.lineCap = "round";
    DR.lineJoin = "round";
    for (let stroke of data.drawing) {
      DR.beginPath();
      DR.strokeStyle = this.getStrokeColor(stroke[0]);
      DR.moveTo(
        stroke[1][0] - (this.camera.x - width / 2),
        stroke[1][1] - (this.camera.y - height / 2),
      );
      for (let i = 2; i < stroke.length; i++) {
        DR.lineTo(
          stroke[i][0] - (this.camera.x - width / 2),
          stroke[i][1] - (this.camera.y - height / 2),
        );
      }
      DR.stroke();
    }

    if (data.textAnnotations) {
      DR.font = "bold 80px Arial";
      DR.textAlign = "center";
      DR.textBaseline = "top";
      for (let text of data.textAnnotations) {
        DR.fillStyle = this.getStrokeColor(text[2]);
        DR.fillText(
          text[3],
          text[0] - (this.camera.x - width / 2),
          text[1] - (this.camera.y - height / 2) - 40,
        );
      }
    }
  }

  private redrawAll() {
    this.drawBackground();
    this.drawRobots();
    this.redrawDrawing();
  }

  private getStrokeColor(id) {
    switch (id) {
      case 0: {
        return "white";
      }
      case 1: {
        return "#ef4444";
      }
      case 2: {
        return "#3b82f6";
      }
      case 3: {
        return "#22c55e";
      }
      case 4: {
        return "#eab308";
      }
      default:
        return "white";
    }
  }

  private toggleMode(mode: string) {
    if (this.mode === mode) return;
    this.lastSelected = null;
    this.selected = null;
    document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
    document
      .getElementById(`whiteboard-toolbar-mode-${this.mode}`)
      ?.classList.remove("font-extrabold");
    document
      .getElementById(`whiteboard-toolbar-mode-${this.mode}`)
      ?.classList.remove("text-zinc-100");
    document
      .getElementById(`whiteboard-toolbar-mode-${this.mode}`)
      ?.classList.add("text-zinc-300");
    document
      .getElementById(`whiteboard-toolbar-mode-${mode}`)
      ?.classList.add("font-extrabold");
    document
      .getElementById(`whiteboard-toolbar-mode-${mode}`)
      ?.classList.add("text-zinc-100");
    document
      .getElementById(`whiteboard-toolbar-mode-${mode}`)
      ?.classList.remove("text-zinc-300");
    this.mode = mode;
    
    // Hide toggle view button when in notes mode, show it otherwise
    const toggleViewButton = document.getElementById("whiteboard-toolbar-view-toggle");
    if (mode === "notes") {
      toggleViewButton?.classList.add("hidden");
    } else {
      toggleViewButton?.classList.remove("hidden");
    }
    
    this.redrawAll();

    // Update undo/redo buttons for the new mode
    this.updateUndoRedoButtons();
  }

  private isRobotAtPoint(robot: any, x: number, y: number) {
    return isPointInRotRect(x, y, robot.x, robot.y, robot.w, robot.h, robot.r);
  }

  private getRobotAtPoint(
    x: number,
    y: number,
  ): [string, any, number, number] | null {
    const data = this.getData();

    if (data === null) return null;

    if (this.isRobotAtPoint(data.redOneRobot, x, y)) {
      return [
        "redOne",
        data.redOneRobot,
        data.redOneRobot.x - x,
        data.redOneRobot.y - y,
      ];
    }
    if (this.isRobotAtPoint(data.redTwoRobot, x, y)) {
      return [
        "redTwo",
        data.redTwoRobot,
        data.redTwoRobot.x - x,
        data.redTwoRobot.y - y,
      ];
    }
    if (this.isRobotAtPoint(data.redThreeRobot, x, y)) {
      return [
        "redThree",
        data.redThreeRobot,
        data.redThreeRobot.x - x,
        data.redThreeRobot.y - y,
      ];
    }
    if (this.isRobotAtPoint(data.blueOneRobot, x, y)) {
      return [
        "blueOne",
        data.blueOneRobot,
        data.blueOneRobot.x - x,
        data.blueOneRobot.y - y,
      ];
    }
    if (this.isRobotAtPoint(data.blueTwoRobot, x, y)) {
      return [
        "blueTwo",
        data.blueTwoRobot,
        data.blueTwoRobot.x - x,
        data.blueTwoRobot.y - y,
      ];
    }
    if (this.isRobotAtPoint(data.blueThreeRobot, x, y)) {
      return [
        "blueThree",
        data.blueThreeRobot,
        data.blueThreeRobot.x - x,
        data.blueThreeRobot.y - y,
      ];
    }
    return null;
  }

  private onClick(e: MouseEvent) {
    const rect = drawing.getBoundingClientRect();
    const x =
      Math.round(e.clientX / scaling - rect.left / scaling) -
      (width / 2 - this.camera.x);
    const y =
      Math.round(e.clientY / scaling - rect.top / scaling) -
      (height / 2 - this.camera.y);
    if (clickMovement > 30) return;

    if (this.selected == null) {
      document
        .getElementById("whiteboard-robot-config")
        ?.classList.add("hidden");
    } else {
      if (
        this.lastSelected !== null &&
        this.lastSelected[0] == this.selected[0]
      ) {
        if (
          document
            .getElementById("whiteboard-robot-config")
            ?.classList.contains("hidden")
        ) {
          document
            .getElementById("whiteboard-robot-config")
            ?.classList.remove("hidden");
        } else {
          document
            .getElementById("whiteboard-robot-config")
            ?.classList.add("hidden");
        }
      } else {
        document
          .getElementById("whiteboard-robot-config")
          ?.classList.add("hidden");
      }
    }
  }

  private onPointerMove(e: PointerEvent) {
    const rect = drawing.getBoundingClientRect();
    const x =
      Math.round(e.clientX / scaling - rect.left / scaling) -
      (width / 2 - this.camera.x);
    const y =
      Math.round(e.clientY / scaling - rect.top / scaling) -
      (height / 2 - this.camera.y);
    clickMovement += Math.abs(x) + Math.abs(y);
    if (this.selected == null && this.isPointerDown) {
      if (this.currentTool == "marker") {
        if (
          Math.hypot(
            x -
              this.currentStrokePoints[this.currentStrokePoints.length - 1][0],
            y -
              this.currentStrokePoints[this.currentStrokePoints.length - 1][1],
          ) < 10
        )
          return;
        this.currentStrokePoints.push([x, y]);
        DR.lineWidth = 10;
        DR.lineCap = "round";
        DR.lineJoin = "round";
        DR.strokeStyle = this.getStrokeColor(this.currentColor);
        DR.lineTo(
          x - (this.camera.x - width / 2),
          y - (this.camera.y - height / 2),
        );
        DR.stroke();
      } else if (this.currentTool == "eraser") {
        if (
          Math.hypot(
            x - this.currentErasePoint.x,
            y - this.currentErasePoint.y,
          ) < 20
        )
          return;
        this.lastErasePoint = this.currentErasePoint;
        this.currentErasePoint = { x: x, y: y };
        const data = this.getData();
        if (data == null) return;
        const bboxes = data.drawingBBox;
        for (let i = bboxes.length - 1; i >= 0; i--) {
          if (
            isSegmentInBound(
              x,
              y,
              this.lastErasePoint.x,
              this.lastErasePoint.y,
              bboxes[i][0],
              bboxes[i][1],
              bboxes[i][2],
              bboxes[i][3],
            )
          ) {
            const stroke = data.drawing[i];
            for (let j = 0; j < stroke.length - 2; j++) {
              if (
                isSegmentsIntersecting(
                  x,
                  y,
                  this.lastErasePoint.x,
                  this.lastErasePoint.y,
                  stroke[j][0],
                  stroke[j][1],
                  stroke[j + 1][0],
                  stroke[j + 1][1],
                )
              ) {
                data.drawing.splice(i, 1);
                data.drawingBBox.splice(i, 1);
                this.redrawDrawing();
                this.currentErasedStrokes.push(stroke);
                this.currentErasedStrokeIndexes.push(i);
                break;
              }
            }
          }
        }
      }
    } else if (this.selected != null && this.isPointerDown) {
      if (this.selectedType === "robot") {
        this.selected[1].x = x + this.selected[2];
        this.selected[1].y = y + this.selected[3];

        const slot = this.selected[0];
        const isBlueTeam =
          slot === "blueOne" || slot === "blueTwo" || slot === "blueThree";
        const rotControlDistance = isBlueTeam
          ? -this.selected[1].w / 2
          : this.selected[1].w / 2;

        this.rotControl = {
          x:
            this.selected[1].x +
            rotControlDistance * Math.cos(this.selected[1].r),
          y:
            this.selected[1].y +
            rotControlDistance * Math.sin(this.selected[1].r),
        };
        this.currentAction = "transform";
        this.drawRobots();
      } else if (this.selectedType === "rot") {
        const slot = this.selected[0];
        const isBlueTeam =
          slot === "blueOne" || slot === "blueTwo" || slot === "blueThree";
        const rotControlDistance = isBlueTeam
          ? -this.selected[1].w / 2
          : this.selected[1].w / 2;

        this.rotControl = {
          x:
            this.selected[1].x +
            rotControlDistance * Math.cos(this.selected[1].r),
          y:
            this.selected[1].y +
            rotControlDistance * Math.sin(this.selected[1].r),
        };

        let angle = Math.atan2(y - this.selected[1].y, x - this.selected[1].x);

        if (isBlueTeam) {
          angle += Math.PI;
        }

        this.selected[1].r = angle;
        this.currentAction = "rot";
        this.drawRobots();
      }
    }
  }

  private onPointerDown(e: PointerEvent) {
    this.isPointerDown = true;
    const rect = drawing.getBoundingClientRect();
    const x =
      Math.round(e.clientX / scaling - rect.left / scaling) -
      (width / 2 - this.camera.x);
    const y =
      Math.round(e.clientY / scaling - rect.top / scaling) -
      (height / 2 - this.camera.y);
    const selected = this.getRobotAtPoint(x, y);
    if (this.selected !== null && this.rotControl !== null) {
      if (Math.hypot(x - this.rotControl.x, y - this.rotControl.y) < 30) {
        this.selectedType = "rot";
        this.previousRobotTransform = {
          r: this.selected[1].r,
        };
        return;
      }
    }
    if (selected !== null) {
      const widthConfig = <HTMLInputElement>(
        document.getElementById("whiteboard-robot-config-width")
      );
      const heightConfig = <HTMLInputElement>(
        document.getElementById("whiteboard-robot-config-height")
      );
      widthConfig.value = String(
        Math.round(((selected[1].w * realWidth) / width) * 10) / 10,
      );
      heightConfig.value = String(
        Math.round(((selected[1].h * realHeight) / height) * 10) / 10,
      );
      this.lastSelected = this.selected;
      this.selected = selected;
      this.selectedType = "robot";

      const slot = this.selected[0];
      const isBlueTeam =
        slot === "blueOne" || slot === "blueTwo" || slot === "blueThree";
      const rotControlDistance = isBlueTeam
        ? -this.selected[1].w / 2
        : this.selected[1].w / 2;

      this.rotControl = {
        x:
          this.selected[1].x +
          rotControlDistance * Math.cos(this.selected[1].r),
        y:
          this.selected[1].y +
          rotControlDistance * Math.sin(this.selected[1].r),
      };
      this.previousRobotTransform = {
        x: this.selected[1].x,
        y: this.selected[1].y,
      };
      this.drawRobots();

      clickMovement = 0;
      return;
    }
    this.lastSelected = this.selected;
    this.selected = selected;
    if (this.selected == null) {
      this.drawRobots();
      document
        .getElementById("whiteboard-robot-config")
        ?.classList.add("hidden");
      if (this.currentTool == "marker") {
        DR.lineWidth = 10;
        DR.lineCap = "round";
        DR.lineJoin = "round";
        DR.strokeStyle = this.getStrokeColor(this.currentColor);
        DR.beginPath();
        DR.moveTo(
          x - (this.camera.x - width / 2),
          y - (this.camera.y - height / 2),
        );
        this.currentStrokePoints.push(this.currentColor);
        this.currentStrokePoints.push([x, y]);
      } else if (this.currentTool == "eraser") {
        this.currentErasePoint = { x: x, y: y };
      } else if (this.currentTool == "text" && this.currentTextValue !== "") {
        const data = this.getData();
        if (data !== null) {
          data.textAnnotations.push([
            x,
            y,
            this.currentColor,
            this.currentTextValue,
          ]);
          this.addUndoHistory({
            type: "text",
            ref: [x, y, this.currentColor, this.currentTextValue],
          });
          this.redrawDrawing();
          this.currentTextValue = "";
          document
            .getElementById("whiteboard-number-pad")
            ?.classList.remove("hidden");
        }
      }
    }
    clickMovement = 0;
  }

  private onPointerUp(e: PointerEvent) {
    this.isPointerDown = false;
    if (this.selected !== null) {
      if (this.currentAction !== "none") {
        this.addUndoHistory({
          type: "transform",
          prev: this.previousRobotTransform,
          slot: this.selected[0],
        });
      }
      this.currentAction = "none";
    } else if (this.currentStrokePoints.length > 2) {
      DR.closePath();
      this.addUndoHistory({
        type: "stroke",
        ref: this.currentStrokePoints,
      });
      this.getData()?.drawing.push(this.currentStrokePoints as any);
      this.getData()?.drawingBBox.push(
        getBBox(this.currentStrokePoints) as any,
      );
    } else if (this.currentErasedStrokes.length > 0) {
      this.addUndoHistory({
        type: "erase",
        erased: this.currentErasedStrokes,
        indexes: this.currentErasedStrokeIndexes,
      });
      this.currentErasedStrokes = [];
      this.currentErasedStrokeIndexes = [];
    }
    this.currentStrokePoints = [];
  }

  private onPointerLeave(e: Event) {
    this.isPointerDown = false;
    if (this.currentStrokePoints.length > 2) {
      DR.closePath();
      this.addUndoHistory({
        type: "stroke",
        ref: this.currentStrokePoints,
      });
      this.getData()?.drawing.push(this.currentStrokePoints as any);
      this.getData()?.drawingBBox.push(
        getBBox(this.currentStrokePoints) as any,
      );
    }
    this.currentStrokePoints = [];
  }

  private main() {
    if (!this.active) return;
  }
}

function isPointInRotRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  rr: number,
) {
  const cos = Math.cos(-rr);
  const sin = Math.sin(-rr);
  const localX = cos * (px - rx) - sin * (py - ry);
  const localY = sin * (px - rx) + cos * (py - ry);
  return (
    localX >= -rw / 2 &&
    localX <= rw / 2 &&
    localY >= -rh / 2 &&
    localY <= rh / 2
  );
}

function isPointInBound(
  px: number,
  py: number,
  minx: number,
  miny: number,
  maxx: number,
  maxy: number,
) {
  return !(px < minx || py < miny || px > maxx || py > maxy);
}

function isSegmentInBound(x1, y1, x2, y2, minx, miny, maxx, maxy) {
  if (
    isPointInBound(x1, y1, minx, miny, maxx, maxy) ||
    isPointInBound(x2, y2, minx, miny, maxx, maxy)
  ) {
    return true;
  }

  if (
    isSegmentsIntersecting(x1, y1, x2, y2, minx, miny, maxx, miny) ||
    isSegmentsIntersecting(x1, y1, x2, y2, minx, maxy, maxx, maxy) ||
    isSegmentsIntersecting(x1, y1, x2, y2, minx, miny, minx, maxy) ||
    isSegmentsIntersecting(x1, y1, x2, y2, maxx, miny, maxx, maxy)
  ) {
    return true;
  }

  return false;
}

function isSegmentsIntersecting(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
  const sx = ax2 - ax1;
  const sy = ay2 - ay1;
  const tx = bx2 - bx1;
  const ty = by2 - by1;
  const d = -tx * sy + sx * ty;

  if (Math.abs(d) < 1e-10) return false;

  const s = (-sy * (ax1 - bx1) + sx * (ay1 - by1)) / d;
  const t = (tx * (ay1 - by1) - ty * (ax1 - bx1)) / d;

  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

function getBBox(stroke: any): [number, number, number, number] {
  let minx = stroke[1][0];
  let miny = stroke[1][1];
  let maxx = minx;
  let maxy = miny;
  for (let i = 1; i < stroke.length; i++) {
    let point = stroke[i];
    if (point[0] < minx) {
      minx = point[0];
    } else if (point[0] > maxx) {
      maxx = point[0];
    }
    if (point[1] < miny) {
      miny = point[1];
    } else if (point[1] > maxy) {
      maxy = point[1];
    }
  }
  return [minx, miny, maxx, maxy];
}

function getSortedIndex(arr: number[], num: number): number {
  let left = 0,
    right = arr.length;

  while (left < right) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] < num) left = mid + 1;
    else right = mid;
  }

  return left;
}
