import { Match } from "./match.ts";
import { Model } from "./model.ts";
import { Config } from "./config.ts";
import { getFieldImageForYear, getYearFromFieldImage } from "./manager.ts";

let _backgroundEl: HTMLCanvasElement | null = null;
let _itemsEl: HTMLCanvasElement | null = null;
let _drawingEl: HTMLCanvasElement | null = null;

let _BGctx: CanvasRenderingContext2D | null = null;
let _ITctx: CanvasRenderingContext2D | null = null;
let _DRctx: CanvasRenderingContext2D | null = null;

let _canvasesInitialized = false;

function ensureCanvases(): void {
  if (_canvasesInitialized) return;
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
    const ctx = c.getContext("2d");
    if (ctx) _BGctx = ctx;
  }
  if (!_ITctx) {
    const c = document.createElement("canvas");
    c.width = Config.fieldPNGPixelWidth;
    c.height = Config.fieldPNGPixelHeight;
    const ctx = c.getContext("2d");
    if (ctx) _ITctx = ctx;
  }
  if (!_DRctx) {
    const c = document.createElement("canvas");
    c.width = Config.fieldPNGPixelWidth;
    c.height = Config.fieldPNGPixelHeight;
    const ctx = c.getContext("2d");
    if (ctx) _DRctx = ctx;
  }

  _canvasesInitialized = true;
}

const _canvasStub = (() => {
  const c = document.createElement("canvas");
  c.width = Config.fieldPNGPixelWidth;
  c.height = Config.fieldPNGPixelHeight;
  return c;
})();

const background = new Proxy({} as HTMLCanvasElement, {
  get(_t, prop: PropertyKey, _receiver?: any) {
    ensureCanvases();
    const el = _backgroundEl || _canvasStub;
    const value = (el as any)[prop];
    if (typeof value === "function") return value.bind(el);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, _receiver?: any) {
    ensureCanvases();
    if (_backgroundEl) (_backgroundEl as any)[prop] = val;
    return true;
  },
}) as unknown as HTMLCanvasElement;

const items = new Proxy({} as HTMLCanvasElement, {
  get(_t, prop: PropertyKey, _receiver?: any) {
    ensureCanvases();
    const el = _itemsEl || _canvasStub;
    const value = (el as any)[prop];
    if (typeof value === "function") return value.bind(el);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, _receiver?: any) {
    ensureCanvases();
    if (_itemsEl) (_itemsEl as any)[prop] = val;
    return true;
  },
}) as unknown as HTMLCanvasElement;

const drawing = new Proxy({} as HTMLCanvasElement, {
  get(_t, prop: PropertyKey, _receiver?: any) {
    ensureCanvases();
    const el = _drawingEl || _canvasStub;
    const value = (el as any)[prop];
    if (typeof value === "function") return value.bind(el);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, _receiver?: any) {
    ensureCanvases();
    if (_drawingEl) (_drawingEl as any)[prop] = val;
    return true;
  },
}) as unknown as HTMLCanvasElement;

const BG = new Proxy({} as CanvasRenderingContext2D, {
  get(_t, prop: PropertyKey, _receiver?: any) {
    ensureCanvases();
    const ctx = _BGctx as any;
    const value = ctx[prop];
    if (typeof value === "function") return value.bind(ctx);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, _receiver?: any) {
    ensureCanvases();
    const ctx = _BGctx as any;
    if (ctx) {
      try {
        ctx[prop as any] = val;
      } catch {}
    }
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const IT = new Proxy({} as CanvasRenderingContext2D, {
  get(_t, prop: PropertyKey, _receiver?: any) {
    ensureCanvases();
    const ctx = _ITctx as any;
    const value = ctx[prop];
    if (typeof value === "function") return value.bind(ctx);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, _receiver?: any) {
    ensureCanvases();
    const ctx = _ITctx as any;
    if (ctx) {
      try {
        ctx[prop as any] = val;
      } catch {}
    }
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const DR = new Proxy({} as CanvasRenderingContext2D, {
  get(_t, prop: PropertyKey, _receiver?: any) {
    ensureCanvases();
    const ctx = _DRctx as any;
    const value = ctx[prop];
    if (typeof value === "function") return value.bind(ctx);
    return value;
  },
  set(_t, prop: PropertyKey, val: any, _receiver?: any) {
    ensureCanvases();
    const ctx = _DRctx as any;
    if (ctx) {
      try {
        ctx[prop as any] = val;
      } catch {}
    }
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

const _dpr = window.devicePixelRatio || 1;
const width = Config.fieldPNGPixelWidth;
const height = Config.fieldPNGPixelHeight;
const _realWidth = Config.fieldRealWidthInches;
const _realHeight = Config.fieldRealHeightInches;

let scaling = 1;

const fieldImage = new Image();
let currentFieldImageUrl: string = "";

/**
 * Updates the canvas size to fit the whiteboard wrapper while maintaining aspect ratio.
 * Applies zoom factor for padding and updates all three canvas layers (background, items, drawing).
 */
export function updateCanvasSize() {
  const wrapper = <HTMLElement>document.getElementById("whiteboard-wrapper");
  if (!wrapper) return;

  const fillWidth = wrapper.clientWidth;
  const fillHeight = wrapper.clientHeight;

  const ratioWidth = fillWidth / background.width;
  const ratioHeight = fillHeight / background.height;

  // Apply zoom factor to add padding (0.95 = 5% padding on each side)
  const baseScale = Math.min(ratioWidth, ratioHeight) * 0.95;
  const fieldYear = getYearFromFieldImage(currentFieldImageUrl);
  // Apply tiny zoom-out for 2026 (0.98 ≈ 2% zoom out)
  const yearZoomFactor = fieldYear === 2026 ? 1 : 1;
  scaling = baseScale * yearZoomFactor;

  const scaledWidth = background.width * scaling;
  const scaledHeight = background.height * scaling;

  const leftOffset = (fillWidth - scaledWidth) / 2;
  const topOffset = (fillHeight - scaledHeight) / 2;

  // Visible offset in CSS pixels for the 2026 field (negative moves image up).
  // This adjusts the canvas positioning (not the internal image drawing) so we don't clip
  // the image inside the canvas when shifting vertically.
  const visibleOffsetPx = fieldYear === 2026 ? -30 : 0;
  const minTop = 0;
  const maxTop = Math.max(0, fillHeight - scaledHeight);
  const topOffsetAdjusted = Math.max(
    minTop,
    Math.min(topOffset + visibleOffsetPx, maxTop),
  );

  [background, items, drawing].forEach((e) => {
    e.style.scale = `${scaling}`;
    e.style.left = `${leftOffset}px`;
    e.style.top = `${topOffsetAdjusted}px`;
    e.style.transformOrigin = "top left";
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

  private cachedDrawingRect: DOMRect | null = null;

  private currentStrokePoints: Array<any> = [];
  private currentErasePoint: { x: number; y: number } | null = null;
  private lastErasePoint: { x: number; y: number } | null = null;
  private currentErasedStrokes: any = [];
  private currentErasedStrokeIndexes: any = [];
  private previousRobotTransform: any = {};
  private currentAction = "none";
  private currentTool = "marker";
  private currentColor = 0;

  private autoActionHistory: Array<any> = [];
  private teleopActionHistory: Array<any> = [];
  private endgameActionHistory: Array<any> = [];
  private notesActionHistory: Array<any> = [];

  private autoRedoHistory: Array<any> = [];
  private teleopRedoHistory: Array<any> = [];
  private endgameRedoHistory: Array<any> = [];
  private notesRedoHistory: Array<any> = [];

  private updateInterval: number | null = null;

  private cachedElements: {
    drawConfigMarker: HTMLElement | null;
    drawConfigEraser: HTMLElement | null;
    drawConfigCheckbox: HTMLElement | null;
    colorConfig: HTMLElement | null;
    colorWhite: HTMLElement | null;
    colorRed: HTMLElement | null;
    colorBlue: HTMLElement | null;
    colorGreen: HTMLElement | null;
    colorYellow: HTMLElement | null;
    colorClose: HTMLElement | null;
    undoBtn: HTMLElement | null;
    redoBtn: HTMLElement | null;
  } = {
    drawConfigMarker: null,
    drawConfigEraser: null,
    drawConfigCheckbox: null,
    colorConfig: null,
    colorWhite: null,
    colorRed: null,
    colorBlue: null,
    colorGreen: null,
    colorYellow: null,
    colorClose: null,
    undoBtn: null,
    redoBtn: null,
  };

  static camera_presets: { [key: string]: { x: number; y: number } } = {
    full: { x: width / 2, y: height / 2 },
    red: { x: (3 * width) / 4, y: height / 2 },
    blue: { x: width / 4, y: height / 2 },
  };

  private static readonly MAX_HISTORY_SIZE = 100;

  constructor(model: Model) {
    this.model = model;

    // Initially load the latest field image
    this.loadFieldImage();

    fieldImage.onload = () => this.drawBackground();

    window.addEventListener("resize", this.redrawAll.bind(this));
    window.addEventListener("orientationchange", this.redrawAll.bind(this));
    window.addEventListener("keydown", (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if (
        modifier &&
        (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))
      ) {
        e.preventDefault();
        this.redo();
      }
    });
    drawing.addEventListener("click", (e) => this.onClick(e));
    drawing.addEventListener("pointermove", this.onPointerMove.bind(this));
    drawing.addEventListener("pointerup", this.onPointerUp.bind(this));
    drawing.addEventListener("pointerdown", this.onPointerDown.bind(this));
    drawing.addEventListener("pointerleave", this.onPointerLeave.bind(this));

    document
      .getElementById("whiteboard-toolbar-undo")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.undo();
      });

    document
      .getElementById("whiteboard-toolbar-redo")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.redo();
      });

    document
      .getElementById("whiteboard-toolbar-mode-auto")
      ?.addEventListener("click", (_e) => this.toggleMode("auto"));
    document
      .getElementById("whiteboard-toolbar-mode-teleop")
      ?.addEventListener("click", (_e) => this.toggleMode("teleop"));
    document
      .getElementById("whiteboard-toolbar-mode-endgame")
      ?.addEventListener("click", (_e) => this.toggleMode("endgame"));
    document
      .getElementById("whiteboard-toolbar-mode-notes")
      ?.addEventListener("click", (_e) => this.toggleMode("notes"));
    document
      .getElementById("whiteboard-toolbar-mode-statbotics")
      ?.addEventListener("click", (_e) => this.toggleMode("statbotics"));
    document
      .getElementById("whiteboard-draw-config")
      ?.addEventListener("click", (_e) => {
        if (this.currentTool == "marker") {
          this.currentTool = "eraser";
          document
            .getElementById("whiteboard-draw-config-marker")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-draw-config-eraser")
            ?.style.setProperty("display", "inline");
          document
            .getElementById("whiteboard-draw-config-checkbox")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-color-config")
            ?.classList.add("hidden");
        } else if (this.currentTool == "eraser") {
          // Only show checkbox tool in notes mode, otherwise cycle back to marker
          if (this.mode === "notes") {
            this.currentTool = "checkbox";
            document
              .getElementById("whiteboard-draw-config-marker")
              ?.style.setProperty("display", "none");
            document
              .getElementById("whiteboard-draw-config-eraser")
              ?.style.setProperty("display", "none");
            document
              .getElementById("whiteboard-draw-config-checkbox")
              ?.style.setProperty("display", "inline");
            document
              .getElementById("whiteboard-color-config")
              ?.classList.remove("hidden");
          } else {
            this.currentTool = "marker";
            document
              .getElementById("whiteboard-draw-config-marker")
              ?.style.setProperty("display", "inline");
            document
              .getElementById("whiteboard-draw-config-eraser")
              ?.style.setProperty("display", "none");
            document
              .getElementById("whiteboard-draw-config-checkbox")
              ?.style.setProperty("display", "none");
            document
              .getElementById("whiteboard-color-config")
              ?.classList.remove("hidden");
          }
        } else if (this.currentTool == "checkbox") {
          this.currentTool = "marker";
          document
            .getElementById("whiteboard-draw-config-marker")
            ?.style.setProperty("display", "inline");
          document
            .getElementById("whiteboard-draw-config-eraser")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-draw-config-checkbox")
            ?.style.setProperty("display", "none");
          document
            .getElementById("whiteboard-color-config")
            ?.classList.remove("hidden");
        }
      });

    document
      .getElementById("whiteboard-color-close")
      ?.addEventListener("click", (_e) => {
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
      ?.addEventListener("click", (_e) => {
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
      ?.addEventListener("click", (_e) => {
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
      ?.addEventListener("click", (_e) => {
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
      ?.addEventListener("click", (_e) => {
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
      ?.addEventListener("click", (_e) => {
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

    this.cachedElements.drawConfigMarker = document.getElementById(
      "whiteboard-draw-config-marker",
    );
    this.cachedElements.drawConfigEraser = document.getElementById(
      "whiteboard-draw-config-eraser",
    );
    this.cachedElements.drawConfigCheckbox = document.getElementById(
      "whiteboard-draw-config-checkbox",
    );
    this.cachedElements.colorConfig = document.getElementById(
      "whiteboard-color-config",
    );
    this.cachedElements.colorWhite = document.getElementById(
      "whiteboard-color-white",
    );
    this.cachedElements.colorRed = document.getElementById(
      "whiteboard-color-red",
    );
    this.cachedElements.colorBlue = document.getElementById(
      "whiteboard-color-blue",
    );
    this.cachedElements.colorGreen = document.getElementById(
      "whiteboard-color-green",
    );
    this.cachedElements.colorYellow = document.getElementById(
      "whiteboard-color-yellow",
    );
    this.cachedElements.colorClose = document.getElementById(
      "whiteboard-color-close",
    );
    this.cachedElements.undoBtn = document.getElementById(
      "whiteboard-toolbar-undo",
    );
    this.cachedElements.redoBtn = document.getElementById(
      "whiteboard-toolbar-redo",
    );

    requestAnimationFrame(this.main.bind(this));

    this.updateInterval = window.setInterval(() => {
      if (this.match !== null) {
        this.model.updateMatch(this.match.id);
      }
    }, 3000);
  }

  /**
   * Sets whether the whiteboard is currently active.
   *
   * @param active - True to activate the whiteboard, false to deactivate
   */
  public setActive(active: boolean) {
    this.active = active;

    if (active) {
      const hasHistory = this.getCurrentUndoHistory().length > 0;

      requestAnimationFrame(() => {
        const els = this.cachedElements;

        if (els.undoBtn) {
          els.undoBtn.style.opacity = hasHistory ? "1" : "0.5";
          els.undoBtn.style.cursor = hasHistory ? "pointer" : "not-allowed";
        }

        this.currentTool = "marker";
        this.currentColor = 0;

        if (els.drawConfigMarker) els.drawConfigMarker.style.display = "inline";
        if (els.drawConfigEraser) els.drawConfigEraser.style.display = "none";
        if (els.drawConfigCheckbox)
          els.drawConfigCheckbox.style.display = "none";

        if (els.colorConfig) els.colorConfig.classList.remove("hidden");

        const hideColors = [
          els.colorRed,
          els.colorBlue,
          els.colorGreen,
          els.colorYellow,
          els.colorClose,
        ];
        hideColors.forEach((el) => {
          if (el) {
            el.classList.add("hidden");
            el.classList.remove("border-4");
          }
        });

        if (els.colorWhite) {
          els.colorWhite.classList.remove("hidden", "border-4");
        }
      });
    } else {
      if (this.match !== null) this.model.updateMatch(this.match.id);

      this.match = null;
      this.lastSelected = null;
      this.selected = null;

      // Clear history arrays
      this.autoActionHistory = [];
      this.teleopActionHistory = [];
      this.endgameActionHistory = [];
      this.notesActionHistory = [];
      this.autoRedoHistory = [];
      this.teleopRedoHistory = [];
      this.endgameRedoHistory = [];
      this.notesRedoHistory = [];

      if (this.updateInterval !== null) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    }
  }

  /**
   * Sets the match to be displayed and edited on the whiteboard.
   * Loads the appropriate field image based on the match's field metadata or match year.
   *
   * @param match - The match object to display
   */
  public setMatch(match: Match) {
    this.match = match;
    // Prefer an explicit selected field year (if the match included one) otherwise use the TBA year
    const selectedYear =
      (match as any).fieldMetadata?.selectedFieldYear ?? match.tbaYear;
    this.loadFieldImage(selectedYear);
    this.redrawAll();
    this.updateUndoRedoButtons();
  }

  /**
   * Returns the year of the currently loaded field image (if any).
   */
  public getCurrentFieldYear(): number | undefined {
    return getYearFromFieldImage(currentFieldImageUrl);
  }

  /**
   * Toggles between different field view modes (full, red-only, blue-only).
   */
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

  /**
   * Adds an action to the undo history for the current mode.
   *
   * @param action - The action to record in history
   */
  private addUndoHistory(action: any) {
    this.clearCurrentRedoHistory();

    let history: Array<any> | null = null;
    if (this.mode === "auto") {
      history = this.autoActionHistory;
    } else if (this.mode === "teleop") {
      history = this.teleopActionHistory;
    } else if (this.mode === "endgame") {
      history = this.endgameActionHistory;
    } else if (this.mode === "notes") {
      history = this.notesActionHistory;
    }

    if (history) {
      history.push(action);

      if (history.length > Whiteboard.MAX_HISTORY_SIZE) {
        history.shift(); // Remove oldest action
      }
    }

    this.updateUndoRedoButtons();
  }

  /**
   * Clears the redo history for the current mode.
   */
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

  /**
   * Retrieves the redo history for the current mode.
   *
   * @returns The redo history array for the active mode
   */
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

  /**
   * Updates the visual state of undo and redo buttons based on history availability.
   */
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

  /**
   * Retrieves the undo history for the current mode.
   *
   * @returns The undo history array for the active mode
   */
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

  /**
   * Undoes the last action in the current mode by reverting changes.
   */
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
    } else if (action.type === "checkbox") {
      const data = this.getData();
      if (data !== null) {
        if (action.ref) {
          const ref = action.ref as any[];
          const idx = data.checkboxes.findIndex(
            (cb: any) =>
              cb[0] === ref[0] && cb[1] === ref[1] && cb[2] === ref[2],
          );
          if (idx !== -1) {
            data.checkboxes.splice(idx, 1);
          } else {
            data.checkboxes.pop();
          }
        } else {
          data.checkboxes.pop();
        }
        this.redrawDrawing();
      }
    } else if (action.type === "checkbox-toggle") {
      const data = this.getData();
      if (
        data !== null &&
        action.index !== undefined &&
        data.checkboxes[action.index]
      ) {
        data.checkboxes[action.index][3] = action.prevChecked;
        this.redrawDrawing();
      }
    } else if (action.type === "checkbox-erase") {
      // Undo erasing a checkbox - restore it at the original index
      const data = this.getData();
      if (data !== null && action.ref) {
        data.checkboxes.splice(action.index, 0, action.ref);
        this.redrawDrawing();
      }
    }

    this.updateUndoRedoButtons();
  }

  /**
   * Redoes the last undone action in the current mode.
   */
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
        // Re-apply the erase by removing the strokes at the stored indexes
        // Sort indexes in descending order to avoid index shifting issues
        const sortedIndexes = [...action.indexes].sort((a, b) => b - a);
        for (const idx of sortedIndexes) {
          if (idx < data.drawing.length) {
            data.drawing.splice(idx, 1);
            data.drawingBBox.splice(idx, 1);
          }
        }
        this.redrawDrawing();
      }
    } else if (action.type === "checkbox") {
      const data = this.getData();
      if (data !== null) {
        if (action.ref) {
          data.checkboxes.push(action.ref);
        }
        this.redrawDrawing();
      }
    } else if (action.type === "checkbox-toggle") {
      const data = this.getData();
      if (
        data !== null &&
        action.index !== undefined &&
        data.checkboxes[action.index]
      ) {
        data.checkboxes[action.index][3] = action.newChecked;
        this.redrawDrawing();
      }
    } else if (action.type === "checkbox-erase") {
      // Redo erasing a checkbox - remove it again
      const data = this.getData();
      if (data !== null && action.index !== undefined) {
        data.checkboxes.splice(action.index, 1);
        this.redrawDrawing();
      }
    }

    this.updateUndoRedoButtons();
  }

  /**
   * Loads the appropriate field image for the specified year.
   *
   * @param year - Optional year to load field image for. Uses latest if not specified.
   */
  private loadFieldImage(year?: number): void {
    const newUrl = getFieldImageForYear(year);
    if (newUrl !== currentFieldImageUrl) {
      currentFieldImageUrl = newUrl;
      fieldImage.src = newUrl;
    }
  }

  /**
   * Draws the field background image on the background canvas layer.
   */
  private drawBackground(): void {
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
    const fieldYear = getYearFromFieldImage(currentFieldImageUrl);
    // Draw the field image scaled to the canvas size so it fills the full drawing area.
    // This ensures the entire image is rendered into the canvas regardless of the image's intrinsic dimensions.
    BG.drawImage(fieldImage, 0, 0, width, height);

    BG.restore();

    if (this.match == null) return;

    BG.font = "bold 64px sans-serif";
    BG.fillStyle = "white";
    BG.textAlign = "center";
    BG.textBaseline = "middle";

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(v, hi));

    const margin = fieldYear === 2026 ? 112 : 96;

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

      // For 2026: push labels outward horizontally: blue side -> left, red side -> right
      const outwardPx = fieldYear === 2026 ? 75 : 0;
      const sideShift = stationX < width / 2 ? -outwardPx : outwardPx;

      // Expand horizontal clamp bounds by outwardPx so labels can be positioned outside the image area
      const cx = clamp(
        px + sideShift,
        effectiveMarginX - outwardPx,
        width - effectiveMarginX + outwardPx,
      );
      const cy = clamp(py, effectiveMarginY, height - effectiveMarginY);

      BG.save();
      BG.translate(cx, cy);
      BG.rotate(rotation);
      BG.fillText(text, 0, 0);
      BG.restore();
    };

    // Only draw station labels for the focused side (or both when in 'full' view)
    if (this.currentView === "full" || this.currentView === "red") {
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
    }

    if (this.currentView === "full" || this.currentView === "blue") {
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
  }

  /**
   * Draws a robot on the canvas with its team number and selection state.
   *
   * @param name - Display name of the robot
   * @param robot - Robot position and dimensions data
   * @param team - Team number
   * @param slot - Robot slot identifier (e.g., "r1", "b2")
   */
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
    if (this.currentView === "full" || this.currentView === team) {
      IT.fillText(name, 0, 0);
    }

    if (this.selected !== null && this.selected[0] == slot) {
      IT.beginPath();
      IT.fillStyle = "white";
      const rotControlX = team === "blue" ? -robot.w / 2 : robot.w / 2;
      IT.arc(rotControlX, 0, 20, 0, Math.PI * 2);
      IT.fill();
    }

    IT.restore();
  }

  /**
   * Retrieves the phase data for the current mode.
   *
   * @returns The phase data object or null if no match is loaded
   */
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

  /**
   * Draws all robots on the items canvas layer.
   */
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

  /**
   * Redraws all drawing strokes and checkboxes on the drawing canvas layer.
   */
  private redrawDrawing() {
    const data = this.getData();

    if (data === null || this.match === null) return;

    const offsetX = this.camera.x - width / 2;
    const offsetY = this.camera.y - height / 2;

    DR.clearRect(0, 0, width, height);

    DR.lineWidth = 10;
    DR.lineCap = "round";
    DR.lineJoin = "round";

    let currentStrokeColor = "";

    for (const stroke of data.drawing) {
      if (stroke.length < 2) continue;

      const color = this.getStrokeColor(stroke[0]);

      if (stroke.length === 2) {
        if (currentStrokeColor !== color) {
          DR.fillStyle = color;
          currentStrokeColor = color;
        }

        DR.beginPath();
        DR.arc(
          stroke[1][0] - offsetX,
          stroke[1][1] - offsetY,
          5,
          0,
          2 * Math.PI,
        );
        DR.fill();
      } else {
        if (currentStrokeColor !== color) {
          DR.strokeStyle = color;
          currentStrokeColor = color;
        }

        DR.beginPath();

        DR.moveTo(stroke[1][0] - offsetX, stroke[1][1] - offsetY);

        for (let i = 2; i < stroke.length; i++) {
          DR.lineTo(stroke[i][0] - offsetX, stroke[i][1] - offsetY);
        }

        DR.stroke();
      }
    }

    if (data.checkboxes && data.checkboxes.length > 0) {
      const boxSize = 150;
      const checkPadding = 15;

      for (const checkbox of data.checkboxes) {
        const x = checkbox[0] - offsetX;
        const y = checkbox[1] - offsetY;
        const color = this.getStrokeColor(checkbox[2]);
        const checked = checkbox[3];

        DR.strokeStyle = color;
        DR.lineWidth = 8;
        DR.strokeRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize);

        if (checked) {
          DR.strokeStyle = "#22c55e";
          DR.lineWidth = 12;
          DR.lineCap = "round";
          DR.lineJoin = "round";
          DR.beginPath();
          DR.moveTo(x - boxSize / 2 + checkPadding, y);
          DR.lineTo(x - boxSize / 6, y + boxSize / 2 - checkPadding);
          DR.lineTo(
            x + boxSize / 2 - checkPadding,
            y - boxSize / 2 + checkPadding,
          );
          DR.stroke();
        }
      }

      DR.lineWidth = 10;
      DR.lineCap = "round";
      DR.lineJoin = "round";
    }
  }

  /**
   * Redraws all canvas layers (background, robots, and drawings).
   */
  private redrawAll() {
    this.drawBackground();
    this.drawRobots();
    this.redrawDrawing();
  }

  /**
   * Forces a complete redraw of all canvas layers.
   */
  public forceRedraw() {
    this.redrawAll();
  }

  /**
   * Gets the stroke color for a given color ID.
   *
   * @param id - The color identifier (0-4)
   * @returns The hex color string
   */
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

  /**
   * Switches the whiteboard to a different phase mode (auto, teleop, endgame, notes, statbotics).
   *
   * @param mode - The mode to switch to
   */
  private toggleMode(mode: string) {
    if (this.mode === mode) return;
    this.lastSelected = null;
    this.selected = null;
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

    // Show/hide appropriate containers based on mode
    const whiteboardWrapper = document.getElementById("whiteboard-wrapper");
    const statboticsContainer = document.getElementById(
      "whiteboard-statbotics-container",
    );
    const drawConfig = document.getElementById("whiteboard-draw-config");
    const colorConfig = document.getElementById("whiteboard-color-config");

    if (mode === "statbotics") {
      whiteboardWrapper?.classList.add("hidden");
      statboticsContainer?.classList.remove("hidden");
      drawConfig?.classList.add("hidden");
      colorConfig?.classList.add("hidden");
    } else {
      whiteboardWrapper?.classList.remove("hidden");
      statboticsContainer?.classList.add("hidden");
      drawConfig?.classList.remove("hidden");
      colorConfig?.classList.remove("hidden");
    }

    const toggleViewButton = document.getElementById(
      "whiteboard-toolbar-view-toggle",
    );
    if (mode === "notes" || mode === "statbotics") {
      toggleViewButton?.classList.add("hidden");
    } else {
      toggleViewButton?.classList.remove("hidden");
      if (this.currentTool === "checkbox") {
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
          .getElementById("whiteboard-draw-config-checkbox")
          ?.style.setProperty("display", "none");
        document
          .getElementById("whiteboard-number-pad")
          ?.classList.add("hidden");
        document
          .getElementById("whiteboard-color-config")
          ?.classList.remove("hidden");
      }
    }

    if (mode !== "statbotics") {
      // Update canvas size when switching from statbotics to ensure proper rendering
      requestAnimationFrame(() => {
        updateCanvasSize();
        this.redrawAll();
      });
      // Update undo/redo buttons for the new mode
      this.updateUndoRedoButtons();
    }
  }

  /**
   * Resets the whiteboard mode to the default "auto" mode.
   * Should be called when loading a new match to clear previous state.
   */
  public resetMode() {
    if (this.mode !== "auto") {
      this.toggleMode("auto");
    }
  }

  /**
   * Checks if a point is within a robot's rotated rectangle bounds.
   *
   * @param robot - The robot with position and dimensions
   * @param x - The x-coordinate to check
   * @param y - The y-coordinate to check
   * @returns True if the point is within the robot bounds
   */
  private isRobotAtPoint(robot: any, x: number, y: number) {
    return isPointInRotRect(x, y, robot.x, robot.y, robot.w, robot.h, robot.r);
  }

  /**
   * Finds which robot is at the specified point.
   *
   * @param x - The x-coordinate to check
   * @param y - The y-coordinate to check
   * @returns A tuple of [slot, robot] if found, or null if no robot at point
   */
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
    const _x =
      Math.round(e.clientX / scaling - rect.left / scaling) -
      (width / 2 - this.camera.x);
    const _y =
      Math.round(e.clientY / scaling - rect.top / scaling) -
      (height / 2 - this.camera.y);
    if (clickMovement > 30) return;
  }

  private onPointerMove(e: PointerEvent) {
    // Performance: Use cached rect if available, otherwise get fresh one
    const rect = this.cachedDrawingRect || drawing.getBoundingClientRect();
    const x =
      Math.round(e.clientX / scaling - rect.left / scaling) -
      (width / 2 - this.camera.x);
    const y =
      Math.round(e.clientY / scaling - rect.top / scaling) -
      (height / 2 - this.camera.y);
    clickMovement += Math.abs(x) + Math.abs(y);
    if (this.selected == null && this.isPointerDown) {
      if (this.currentTool == "marker") {
        // Performance: Reduce distance threshold from 10px to 2px for better tracking
        // This captures more points during fast movements
        if (
          Math.hypot(
            x -
              this.currentStrokePoints[this.currentStrokePoints.length - 1][0],
            y -
              this.currentStrokePoints[this.currentStrokePoints.length - 1][1],
          ) < 2
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
        const eraserRadius = 6;

        if (
          Math.hypot(
            x - this.currentErasePoint.x,
            y - this.currentErasePoint.y,
          ) < 5
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
              bboxes[i][0] - eraserRadius,
              bboxes[i][1] - eraserRadius,
              bboxes[i][2] + eraserRadius,
              bboxes[i][3] + eraserRadius,
            )
          ) {
            const stroke = data.drawing[i];
            let shouldErase = false;

            // Handle single-point strokes (dots) - length is 2: [color, point]
            if (stroke.length === 2) {
              const dotX = stroke[1][0];
              const dotY = stroke[1][1];
              const dotRadius = 5; // Match the dot radius from drawing code

              const distToEraser = distanceFromPointToSegment(
                dotX,
                dotY,
                this.lastErasePoint.x,
                this.lastErasePoint.y,
                x,
                y,
              );

              shouldErase = distToEraser <= eraserRadius + dotRadius;
            } else {
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
                    eraserRadius,
                  )
                ) {
                  shouldErase = true;
                  break;
                }
              }
            }

            if (shouldErase) {
              data.drawing.splice(i, 1);
              data.drawingBBox.splice(i, 1);
              this.redrawDrawing();
              this.currentErasedStrokes.push(stroke);
              this.currentErasedStrokeIndexes.push(i);
            }
          }
        }

        // Erase checkboxes
        if (data.checkboxes && data.checkboxes.length > 0) {
          const boxSize = 200;
          for (let i = data.checkboxes.length - 1; i >= 0; i--) {
            const cb = data.checkboxes[i];
            const cbX = cb[0];
            const cbY = cb[1];
            // Check if eraser line passes through or near the checkbox
            const distToCheckbox = distanceFromPointToSegment(
              cbX,
              cbY,
              this.lastErasePoint.x,
              this.lastErasePoint.y,
              x,
              y,
            );
            if (distToCheckbox <= boxSize / 2 + eraserRadius) {
              const erasedCheckbox = data.checkboxes.splice(i, 1)[0];
              this.addUndoHistory({
                type: "checkbox-erase",
                ref: erasedCheckbox,
                index: i,
              });
              this.redrawDrawing();
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

    // Performance: Cache bounding rect and enable pointer capture for better tracking
    this.cachedDrawingRect = drawing.getBoundingClientRect();
    drawing.setPointerCapture(e.pointerId);

    const rect = this.cachedDrawingRect;
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
      } else if (this.currentTool == "checkbox") {
        const data = this.getData();
        if (data !== null) {
          // Check if clicking on an existing checkbox to toggle it
          const boxSize = 120;
          const clickedCheckboxIndex = data.checkboxes.findIndex((cb: any) => {
            const cbX = cb[0];
            const cbY = cb[1];
            return (
              Math.abs(x - cbX) <= boxSize / 2 &&
              Math.abs(y - cbY) <= boxSize / 2
            );
          });

          if (clickedCheckboxIndex !== -1) {
            // Toggle existing checkbox
            const prevChecked = data.checkboxes[clickedCheckboxIndex][3];
            data.checkboxes[clickedCheckboxIndex][3] = !prevChecked;
            this.addUndoHistory({
              type: "checkbox-toggle",
              index: clickedCheckboxIndex,
              prevChecked: prevChecked,
              newChecked: !prevChecked,
            });
          } else {
            // Create new checkbox (unchecked by default)
            data.checkboxes.push([x, y, this.currentColor, false]);
            this.addUndoHistory({
              type: "checkbox",
              ref: [x, y, this.currentColor, false],
            });
          }
          this.redrawDrawing();
        }
      }
    }
    clickMovement = 0;
  }

  private onPointerUp(e: PointerEvent) {
    this.isPointerDown = false;

    this.cachedDrawingRect = null;
    try {
      drawing.releasePointerCapture(e.pointerId);
    } catch (_err) {}

    if (this.selected !== null) {
      if (this.currentAction !== "none") {
        const robot = this.selected[1];
        this.addUndoHistory({
          type: "transform",
          prev: this.previousRobotTransform,
          new: {
            x: robot.x,
            y: robot.y,
            r: robot.r,
          },
          slot: this.selected[0],
        });
      }
      this.currentAction = "none";
    } else if (this.currentStrokePoints.length >= 2) {
      if (this.currentStrokePoints.length === 2) {
        const point = this.currentStrokePoints[1];
        const color = this.currentStrokePoints[0];
        DR.fillStyle = this.getStrokeColor(color);
        DR.beginPath();
        DR.arc(
          point[0] - (this.camera.x - width / 2),
          point[1] - (this.camera.y - height / 2),
          5,
          0,
          2 * Math.PI,
        );
        DR.fill();
      } else {
        DR.closePath();
      }

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

  private onPointerLeave(_e: Event) {
    this.isPointerDown = false;

    this.cachedDrawingRect = null;

    if (this.currentStrokePoints.length >= 2) {
      if (this.currentStrokePoints.length === 2) {
        const point = this.currentStrokePoints[1];
        const color = this.currentStrokePoints[0];
        DR.fillStyle = this.getStrokeColor(color);
        DR.beginPath();
        DR.arc(
          point[0] - (this.camera.x - width / 2),
          point[1] - (this.camera.y - height / 2),
          5, // radius of the dot (half of line width which is 10)
          0,
          2 * Math.PI,
        );
        DR.fill();
      } else {
        DR.closePath();
      }

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

function isSegmentsIntersecting(
  ax1,
  ay1,
  ax2,
  ay2,
  bx1,
  by1,
  bx2,
  by2,
  tolerance = 0,
) {
  const sx = ax2 - ax1;
  const sy = ay2 - ay1;
  const tx = bx2 - bx1;
  const ty = by2 - by1;
  const d = -tx * sy + sx * ty;

  if (Math.abs(d) < 1e-10) {
    if (tolerance > 0) {
      return (
        distanceFromPointToSegment(ax1, ay1, bx1, by1, bx2, by2) <= tolerance ||
        distanceFromPointToSegment(ax2, ay2, bx1, by1, bx2, by2) <= tolerance ||
        distanceFromPointToSegment(bx1, by1, ax1, ay1, ax2, ay2) <= tolerance ||
        distanceFromPointToSegment(bx2, by2, ax1, ay1, ax2, ay2) <= tolerance
      );
    }
    return false;
  }

  const s = (-sy * (ax1 - bx1) + sx * (ay1 - by1)) / d;
  const t = (tx * (ay1 - by1) - ty * (ax1 - bx1)) / d;

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    return true;
  }

  // If tolerance is specified, check distance to line segments even if they don't intersect
  if (tolerance > 0) {
    return (
      distanceFromPointToSegment(ax1, ay1, bx1, by1, bx2, by2) <= tolerance ||
      distanceFromPointToSegment(ax2, ay2, bx1, by1, bx2, by2) <= tolerance ||
      distanceFromPointToSegment(bx1, by1, ax1, ay1, ax2, ay2) <= tolerance ||
      distanceFromPointToSegment(bx2, by2, ax1, ay1, ax2, ay2) <= tolerance
    );
  }

  return false;
}

function distanceFromPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.hypot(px - closestX, py - closestY);
}

function getBBox(stroke: any): [number, number, number, number] {
  let minx = stroke[1][0];
  let miny = stroke[1][1];
  let maxx = minx;
  let maxy = miny;
  for (let i = 1; i < stroke.length; i++) {
    const point = stroke[i];
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

  // For single-point strokes (dots), add margin for the dot radius
  if (stroke.length === 2) {
    const dotRadius = 5;
    minx -= dotRadius;
    miny -= dotRadius;
    maxx += dotRadius;
    maxy += dotRadius;
  }

  return [minx, miny, maxx, maxy];
}

function _getSortedIndex(arr: number[], num: number): number {
  let left = 0,
    right = arr.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < num) left = mid + 1;
    else right = mid;
  }

  return left;
}
