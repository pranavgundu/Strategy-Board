import field2025 from "../images/2025.png";
import field2026 from "../images/2026.png";
import { canvasLayout, distanceToSegment, pointInRotatedRect, segmentTouchesBounds, segmentsIntersect, strokeBounds, type Point } from "./geometry";
import { FIELD_HEIGHT, FIELD_WIDTH, MAX_HISTORY, type BoardPhaseName, type CheckboxAnnotation, type RobotPosition, type Stroke, type WhiteboardCommit, type WhiteboardControllerOptions, type WhiteboardMatch, type WhiteboardMode, type WhiteboardPhase, type WhiteboardRefs, type WhiteboardState, type WhiteboardTool } from "./types";

export * from "./geometry";
export * from "./packet";
export * from "./types";

type Slot = "redOne" | "redTwo" | "redThree" | "blueOne" | "blueTwo" | "blueThree";
type View = "full" | "red" | "blue";
type Action =
  | { kind: "stroke"; stroke: Stroke }
  | { kind: "erase"; strokes: Array<{ index: number; stroke: Stroke }>; checkboxes: Array<{ index: number; checkbox: CheckboxAnnotation }> }
  | { kind: "checkbox-add"; checkbox: CheckboxAnnotation }
  | { kind: "checkbox-toggle"; index: number; before: boolean; after: boolean }
  | { kind: "transform"; slot: Slot; before: Pick<RobotPosition, "x" | "y" | "r">; after: Pick<RobotPosition, "x" | "y" | "r"> };

const slots: readonly Slot[] = ["redOne", "redTwo", "redThree", "blueOne", "blueTwo", "blueThree"];
const COLORS = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"] as const;
const VIEWS: Record<View, Point> = { full: [FIELD_WIDTH / 2, FIELD_HEIGHT / 2], red: [(FIELD_WIDTH * 3) / 4, FIELD_HEIGHT / 2], blue: [FIELD_WIDTH / 4, FIELD_HEIGHT / 2] };
const fieldImageCache = new Map<string, HTMLImageElement>();

function phaseFor(match: WhiteboardMatch, mode: BoardPhaseName): WhiteboardPhase { return match[mode]; }
function validColor(value: number): number { return Number.isInteger(value) && value >= 0 && value < COLORS.length ? value : 0; }
function isBlue(slot: Slot): boolean { return slot.startsWith("blue"); }
function samePose(a: Pick<RobotPosition, "x" | "y" | "r">, b: Pick<RobotPosition, "x" | "y" | "r">): boolean { return a.x === b.x && a.y === b.y && a.r === b.r; }

/** Begin loading field art once per URL. It is a safe no-op during SSR/tests. */
export function preloadFieldImages(fieldImages: Readonly<Record<number, string>> = { 2025: field2025, 2026: field2026 }): void {
  if (typeof Image === "undefined") return;
  for (const url of Object.values(fieldImages)) {
    if (fieldImageCache.has(url)) continue;
    const image = new Image(); image.decoding = "async"; image.src = url;
    fieldImageCache.set(url, image);
  }
}

/**
 * Canvas-only whiteboard. It deliberately owns transient pointer/render state,
 * while the match object supplied by the application remains the sole durable
 * state. No movement is sent across IPC; `onCommit` fires at gesture boundaries.
 */
export class WhiteboardController {
  private refs: WhiteboardRefs | null = null;
  private contexts: { background: CanvasRenderingContext2D; items: CanvasRenderingContext2D; drawing: CanvasRenderingContext2D } | null = null;
  private match: WhiteboardMatch | null = null;
  private mode: WhiteboardMode = "auto";
  private tool: WhiteboardTool = "marker";
  private color = 0;
  private view: View = "full";
  private camera: Point = VIEWS.full;
  private image: HTMLImageElement | null = null;
  private imageYear: number | undefined;
  private selected: { slot: Slot; robot: RobotPosition; offset: Point; rotating: boolean; before: Pick<RobotPosition, "x" | "y" | "r"> } | null = null;
  private pointer: { id: number; last: Point; stroke: Stroke | null; erased: Extract<Action, { kind: "erase" }> } | null = null;
  private undoHistory = new Map<BoardPhaseName, Action[]>();
  private redoHistory = new Map<BoardPhaseName, Action[]>();
  private resizeObserver: ResizeObserver | null = null;
  private abortController: AbortController | null = null;
  private layout = { scale: 1, left: 0, top: 0 };
  private readonly options: Required<Pick<WhiteboardControllerOptions, "fieldImages">> & Omit<WhiteboardControllerOptions, "fieldImages">;

  constructor(options: WhiteboardControllerOptions = {}) {
    this.options = { fieldImages: { 2025: field2025, 2026: field2026, ...options.fieldImages }, ...options };
    preloadFieldImages(this.options.fieldImages);
  }

  mount(refs: WhiteboardRefs): () => void {
    this.destroy();
    const foundContexts = {
      background: refs.background.getContext("2d"), items: refs.items.getContext("2d"), drawing: refs.drawing.getContext("2d"),
    };
    if (!foundContexts.background || !foundContexts.items || !foundContexts.drawing) throw new Error("Strategy Board requires 2D canvas support.");
    const contexts = { background: foundContexts.background, items: foundContexts.items, drawing: foundContexts.drawing };
    this.refs = refs;
    this.contexts = contexts;
    for (const canvas of [refs.background, refs.items, refs.drawing]) {
      canvas.width = FIELD_WIDTH; canvas.height = FIELD_HEIGHT;
      canvas.style.transformOrigin = "top left";
      canvas.style.touchAction = "none";
    }
    const signal = (this.abortController = new AbortController()).signal;
    refs.drawing.addEventListener("pointerdown", this.onPointerDown, { signal });
    refs.drawing.addEventListener("pointermove", this.onPointerMove, { signal });
    refs.drawing.addEventListener("pointerup", this.onPointerEnd, { signal });
    refs.drawing.addEventListener("pointercancel", this.onPointerEnd, { signal });
    refs.drawing.addEventListener("lostpointercapture", this.onPointerEnd, { signal });
    window.addEventListener("keydown", this.onKeyDown, { signal });
    this.resizeObserver = new ResizeObserver(() => this.updateLayout());
    this.resizeObserver.observe(refs.container);
    this.updateLayout();
    this.redrawAll();
    return () => this.destroy();
  }

  destroy(): void {
    this.abortController?.abort(); this.abortController = null;
    this.resizeObserver?.disconnect(); this.resizeObserver = null;
    this.refs = null; this.contexts = null; this.pointer = null; this.selected = null;
  }

  setMatch(match: WhiteboardMatch | null): void {
    if (this.match?.id !== match?.id) {
      this.undoHistory.clear();
      this.redoHistory.clear();
    }
    this.match = match;
    this.selected = null; this.pointer = null;
    this.loadFieldImage();
    this.redrawAll(); this.emitState();
  }
  getMatch(): WhiteboardMatch | null { return this.match; }
  /** Field artwork year in use; phase labels differ from 2026 onward. */
  getCurrentFieldYear(): number | undefined { return this.fieldYear(); }
  getState(): WhiteboardState { return { mode: this.mode, tool: this.tool, color: this.color, view: this.view, canUndo: this.canUndo(), canRedo: this.canRedo(), isCanvasVisible: this.mode !== "statbotics" }; }
  setMode(mode: WhiteboardMode): void {
    if (this.mode === mode) return;
    this.mode = mode; this.selected = null; this.pointer = null;
    if (mode !== "notes" && this.tool === "checkbox") this.tool = "marker";
    this.redrawAll(); this.emitState();
  }
  setTool(tool: WhiteboardTool): void { if (tool === "checkbox" && this.mode !== "notes") tool = "marker"; if (this.tool !== tool) { this.tool = tool; this.emitState(); } }
  toggleTool(): void { this.setTool(this.tool === "marker" ? "eraser" : this.tool === "eraser" ? (this.mode === "notes" ? "checkbox" : "marker") : "marker"); }
  setColor(color: number): void { const next = validColor(color); if (next !== this.color) { this.color = next; this.emitState(); } }
  toggleView(): void { this.view = this.view === "full" ? "red" : this.view === "red" ? "blue" : "full"; this.camera = VIEWS[this.view]; this.redrawAll(); this.emitState(); }
  forceRedraw(): void { this.redrawAll(); }
  resetMode(): void { this.setMode("auto"); }

  canUndo(): boolean { const mode = this.dataMode(); return !!mode && (this.undoHistory.get(mode)?.length ?? 0) > 0; }
  canRedo(): boolean { const mode = this.dataMode(); return !!mode && (this.redoHistory.get(mode)?.length ?? 0) > 0; }
  undo(): void { const mode = this.dataMode(); if (!mode || !this.match) return; const action = this.undoHistory.get(mode)?.pop(); if (!action) return; this.apply(action, "undo"); this.history(this.redoHistory, mode).push(action); this.redrawFor(action); this.commit("undo"); }
  redo(): void { const mode = this.dataMode(); if (!mode || !this.match) return; const action = this.redoHistory.get(mode)?.pop(); if (!action) return; this.apply(action, "redo"); this.history(this.undoHistory, mode).push(action); this.redrawFor(action); this.commit("redo"); }

  /** Produces a complete field-sized PNG (background, robots, and annotations). */
  exportPng(type = "image/png", quality?: number): string | null {
    if (!this.refs || typeof document === "undefined") return null;
    const output = document.createElement("canvas"); output.width = FIELD_WIDTH; output.height = FIELD_HEIGHT;
    const context = output.getContext("2d"); if (!context) return null;
    for (const canvas of [this.refs.background, this.refs.items, this.refs.drawing]) context.drawImage(canvas, 0, 0);
    return output.toDataURL(type, quality);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier || event.code !== "KeyZ") return;
    event.preventDefault(); if (event.shiftKey) this.redo(); else this.undo();
  };
  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.refs || !this.match || this.mode === "statbotics") return;
    if (event.pointerType === "pen" && event.button === 1) { this.toggleTool(); return; }
    if (event.button !== 0 && event.pointerType !== "touch") return;
    event.preventDefault();
    const point = this.eventPoint(event); if (!point) return;
    this.refs.drawing.setPointerCapture(event.pointerId);
    const erased: Extract<Action, { kind: "erase" }> = { kind: "erase", strokes: [], checkboxes: [] };
    this.pointer = { id: event.pointerId, last: point, stroke: null, erased };
    const selected = this.robotAt(point);
    if (this.selected && this.rotationHandleAt(point, this.selected)) {
      this.selected.rotating = true; this.selected.before = this.pose(this.selected.robot); return;
    }
    if (selected) { this.selected = { ...selected, rotating: false, before: this.pose(selected.robot) }; this.drawItems(); return; }
    this.selected = null; this.drawItems();
    if (this.tool === "marker") this.pointer.stroke = [this.color, [point[0], point[1]]];
    else if (this.tool === "checkbox") this.toggleCheckbox(point);
    else this.eraseSegment(point, point, erased);
  };
  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.pointer; if (!pointer || pointer.id !== event.pointerId) return;
    const point = this.eventPoint(event); if (!point) return;
    event.preventDefault();
    if (this.selected) { this.moveSelected(point); pointer.last = point; return; }
    if (this.tool === "marker" && pointer.stroke) {
      if (Math.hypot(point[0] - pointer.last[0], point[1] - pointer.last[1]) < 2) return;
      this.drawStrokeSegment(pointer.last, point, pointer.stroke[0]); pointer.stroke.push([point[0], point[1]]); pointer.last = point;
    } else if (this.tool === "eraser") { this.eraseSegment(pointer.last, point, pointer.erased); pointer.last = point; }
  };
  private readonly onPointerEnd = (event: PointerEvent): void => {
    const pointer = this.pointer; if (!pointer || pointer.id !== event.pointerId) return;
    try { this.refs?.drawing.releasePointerCapture(event.pointerId); } catch { /* browser may already have released it */ }
    this.pointer = null;
    if (this.selected) {
      const { slot, robot, before } = this.selected; const after = this.pose(robot);
      // Keep the robot selected after a drag so its rotation handle remains
      // usable on the next gesture. Clicking empty space still deselects it.
      this.selected = { slot, robot, offset: [0, 0], rotating: false, before: after };
      if (!samePose(before, after)) this.record({ kind: "transform", slot, before, after }, "transform");
      this.drawItems(); return;
    }
    if (pointer.stroke) {
      const phase = this.phase(); if (phase) { phase.drawing.push(pointer.stroke); phase.drawingBBox.push(strokeBounds(pointer.stroke)); this.redrawDrawing(); this.record({ kind: "stroke", stroke: pointer.stroke }, "stroke"); }
    } else if (pointer.erased.strokes.length || pointer.erased.checkboxes.length) this.record(pointer.erased, "erase");
  };

  private dataMode(): BoardPhaseName | null { return this.mode === "statbotics" ? null : this.mode; }
  private phase(): WhiteboardPhase | null { return this.match && this.dataMode() ? phaseFor(this.match, this.dataMode()!) : null; }
  private history(store: Map<BoardPhaseName, Action[]>, mode: BoardPhaseName): Action[] { let values = store.get(mode); if (!values) { values = []; store.set(mode, values); } return values; }
  private record(action: Action, reason: WhiteboardCommit["reason"]): void { const mode = this.dataMode(); if (!mode) return; const undo = this.history(this.undoHistory, mode); undo.push(action); if (undo.length > MAX_HISTORY) undo.shift(); this.redoHistory.set(mode, []); this.commit(reason); }
  private commit(reason: WhiteboardCommit["reason"]): void { const mode = this.dataMode(); if (this.match && mode) void this.options.onCommit?.({ match: this.match, mode, reason }); this.emitState(); }
  private emitState(): void { this.options.onStateChange?.(this.getState()); }

  private apply(action: Action, direction: "undo" | "redo"): void {
    const phase = this.phase(); if (!phase) return;
    if (action.kind === "stroke") {
      if (direction === "undo") { const i = phase.drawing.indexOf(action.stroke); if (i >= 0) { phase.drawing.splice(i, 1); phase.drawingBBox.splice(i, 1); } }
      else { phase.drawing.push(action.stroke); phase.drawingBBox.push(strokeBounds(action.stroke)); }
    } else if (action.kind === "erase") {
      if (direction === "undo") {
        for (const { index, stroke } of [...action.strokes].sort((a, b) => a.index - b.index)) { phase.drawing.splice(index, 0, stroke); phase.drawingBBox.splice(index, 0, strokeBounds(stroke)); }
        for (const { index, checkbox } of [...action.checkboxes].sort((a, b) => a.index - b.index)) phase.checkboxes.splice(index, 0, checkbox);
      } else {
        for (const { stroke } of action.strokes) { const i = phase.drawing.indexOf(stroke); if (i >= 0) { phase.drawing.splice(i, 1); phase.drawingBBox.splice(i, 1); } }
        for (const { checkbox } of action.checkboxes) { const i = phase.checkboxes.indexOf(checkbox); if (i >= 0) phase.checkboxes.splice(i, 1); }
      }
    } else if (action.kind === "checkbox-add") {
      if (direction === "undo") { const i = phase.checkboxes.indexOf(action.checkbox); if (i >= 0) phase.checkboxes.splice(i, 1); } else phase.checkboxes.push(action.checkbox);
    } else if (action.kind === "checkbox-toggle") { if (phase.checkboxes[action.index]) phase.checkboxes[action.index][3] = direction === "undo" ? action.before : action.after; }
    else { const robot = phase[`${action.slot}Robot`]; Object.assign(robot, direction === "undo" ? action.before : action.after); }
  }
  private redrawFor(action: Action): void { if (action.kind === "transform") this.drawItems(); else this.redrawDrawing(); }

  private updateLayout(): void {
    if (!this.refs) return;
    const layout = canvasLayout(this.refs.container.clientWidth, this.refs.container.clientHeight, FIELD_WIDTH, FIELD_HEIGHT, this.fieldYear());
    if (!layout) return; this.layout = layout;
    const transform = `translate(${layout.left}px, ${layout.top}px) scale(${layout.scale})`;
    for (const canvas of [this.refs.background, this.refs.items, this.refs.drawing]) canvas.style.transform = transform;
  }
  private fieldYear(): number | undefined {
    const requested = this.match?.fieldMetadata?.selectedFieldYear ?? this.match?.tbaYear;
    const years = Object.keys(this.options.fieldImages).map(Number).sort((a, b) => a - b);
    if (!years.length) return undefined;
    if (!requested || !Number.isFinite(requested)) return years.at(-1);
    return years.reduce((chosen, year) => year <= requested && year > chosen ? year : chosen, years[0]);
  }
  private loadFieldImage(): void {
    const year = this.fieldYear(); if (year === this.imageYear && this.image) return; this.imageYear = year;
    if (typeof Image === "undefined" || !year) { this.image = null; return; }
    const url = this.options.fieldImages[year];
    let image = fieldImageCache.get(url);
    if (!image) { image = new Image(); image.decoding = "async"; image.src = url; fieldImageCache.set(url, image); }
    image.onload = () => { if (this.image === image) this.drawBackground(); };
    this.image = image; this.updateLayout();
  }
  private redrawAll(): void { this.drawBackground(); this.drawItems(); this.redrawDrawing(); }
  private screen(point: Point): Point { return [point[0] - (this.camera[0] - FIELD_WIDTH / 2), point[1] - (this.camera[1] - FIELD_HEIGHT / 2)]; }
  private drawBackground(): void {
    const context = this.contexts?.background; if (!context) return;
    context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    if (this.mode === "notes") { this.drawNotesGrid(context); return; }
    context.fillStyle = "#0d0d0d"; context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    if (this.image?.complete && this.image.naturalWidth) { const [x, y] = this.screen([0, 0]); context.drawImage(this.image, x, y, FIELD_WIDTH, FIELD_HEIGHT); }
    if (!this.match) return;
    const teams: Array<[string, number, number]> = [[this.match.redOne, 3575, 455], [this.match.redTwo, 3575, 805], [this.match.redThree, 3575, 1155], [this.match.blueOne, -65, 455], [this.match.blueTwo, -65, 805], [this.match.blueThree, -65, 1155]];
    context.font = "bold 64px sans-serif"; context.fillStyle = "white"; context.textAlign = "center"; context.textBaseline = "middle";
    for (const [name, x, y] of teams) { if ((x > FIELD_WIDTH / 2 && this.view === "blue") || (x < FIELD_WIDTH / 2 && this.view === "red")) continue; const [sx, sy] = this.screen([x, y]); context.save(); context.translate(Math.max(70, Math.min(FIELD_WIDTH - 70, sx)), Math.max(70, Math.min(FIELD_HEIGHT - 70, sy))); context.rotate(Math.PI / 2); context.fillText(name, 0, 0); context.restore(); }
  }
  private drawNotesGrid(context: CanvasRenderingContext2D): void { context.fillStyle = "#000"; context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT); context.strokeStyle = "rgba(255,255,255,.2)"; context.lineWidth = 1; for (let x = 0; x < FIELD_WIDTH; x += 100) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, FIELD_HEIGHT); context.stroke(); } for (let y = 0; y < FIELD_HEIGHT; y += 100) { context.beginPath(); context.moveTo(0, y); context.lineTo(FIELD_WIDTH, y); context.stroke(); } }
  private drawItems(): void {
    const context = this.contexts?.items; const phase = this.phase(); if (!context) return; context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT); if (!phase || this.mode === "notes" || this.mode === "statbotics") return;
    for (const slot of slots) this.drawRobot(context, slot, phase[`${slot}Robot`]);
  }
  private drawRobot(context: CanvasRenderingContext2D, slot: Slot, robot: RobotPosition): void {
    const [x, y] = this.screen([robot.x, robot.y]); const selected = this.selected?.slot === slot; const team = isBlue(slot) ? "#2563eb" : "#dc2626";
    context.save(); context.translate(x, y); context.rotate(robot.r); context.fillStyle = team; if (selected) { context.shadowBlur = 28; context.shadowColor = "#fff"; } context.beginPath(); context.roundRect(-robot.w / 2, -robot.h / 2, robot.w, robot.h, 20); context.fill(); context.shadowBlur = 0;
    context.fillStyle = "#242429"; context.beginPath(); context.roundRect(-robot.w / 2 + 17, -robot.h / 2 + 17, robot.w - 34, robot.h - 34, 10); context.fill();
    context.fillStyle = "#fff"; context.font = "bold 48px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; if (this.match && (this.view === "full" || (this.view === "blue") === isBlue(slot))) context.fillText(this.match[slot], 0, 0);
    if (selected) { context.beginPath(); context.arc(isBlue(slot) ? -robot.w / 2 : robot.w / 2, 0, 20, 0, Math.PI * 2); context.fill(); }
    context.restore();
  }
  private redrawDrawing(): void {
    const context = this.contexts?.drawing; const phase = this.phase(); if (!context) return; context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT); if (!phase || this.mode === "statbotics") return;
    for (const stroke of phase.drawing) this.drawStroke(context, stroke);
    for (const checkbox of phase.checkboxes ?? []) this.drawCheckbox(context, checkbox);
  }
  private drawStroke(context: CanvasRenderingContext2D, stroke: Stroke): void {
    if (stroke.length < 2) return; context.lineWidth = 10; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = COLORS[validColor(stroke[0])]; const first = this.screen(stroke[1]);
    if (stroke.length === 2) { context.fillStyle = context.strokeStyle; context.beginPath(); context.arc(first[0], first[1], 5, 0, Math.PI * 2); context.fill(); return; }
    context.beginPath(); context.moveTo(first[0], first[1]); for (const point of stroke.slice(2) as Point[]) { const screen = this.screen(point); context.lineTo(screen[0], screen[1]); } context.stroke();
  }
  private drawStrokeSegment(start: Point, end: Point, color: number): void { const context = this.contexts?.drawing; if (!context) return; const a = this.screen(start); const b = this.screen(end); context.lineWidth = 10; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = COLORS[validColor(color)]; context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.stroke(); }
  private drawCheckbox(context: CanvasRenderingContext2D, checkbox: CheckboxAnnotation): void { const [x, y] = this.screen([checkbox[0], checkbox[1]]); const size = 150; context.strokeStyle = COLORS[validColor(checkbox[2])]; context.lineWidth = 8; context.strokeRect(x - size / 2, y - size / 2, size, size); if (checkbox[3]) { context.strokeStyle = "#22c55e"; context.lineWidth = 12; context.lineCap = "round"; context.beginPath(); context.moveTo(x - size / 2 + 15, y); context.lineTo(x - size / 6, y + size / 2 - 15); context.lineTo(x + size / 2 - 15, y - size / 2 + 15); context.stroke(); } }
  private eventPoint(event: PointerEvent): Point | null { if (!this.refs) return null; const rect = this.refs.drawing.getBoundingClientRect(); if (!rect.width || !rect.height) return null; return [(event.clientX - rect.left) / this.layout.scale + this.camera[0] - FIELD_WIDTH / 2, (event.clientY - rect.top) / this.layout.scale + this.camera[1] - FIELD_HEIGHT / 2]; }
  private pose(robot: RobotPosition): Pick<RobotPosition, "x" | "y" | "r"> { return { x: robot.x, y: robot.y, r: robot.r }; }
  private robotAt(point: Point): { slot: Slot; robot: RobotPosition; offset: Point } | null { const phase = this.phase(); if (!phase || this.mode === "notes") return null; for (const slot of [...slots].reverse()) { const robot = phase[`${slot}Robot`]; if (pointInRotatedRect(point, [robot.x, robot.y], robot.w, robot.h, robot.r)) return { slot, robot, offset: [robot.x - point[0], robot.y - point[1]] }; } return null; }
  private rotationHandleAt(point: Point, selected: NonNullable<WhiteboardController["selected"]>): boolean { const sign = isBlue(selected.slot) ? -1 : 1; const handle: Point = [selected.robot.x + sign * selected.robot.w / 2 * Math.cos(selected.robot.r), selected.robot.y + sign * selected.robot.w / 2 * Math.sin(selected.robot.r)]; return Math.hypot(point[0] - handle[0], point[1] - handle[1]) < 35; }
  private moveSelected(point: Point): void { if (!this.selected) return; const { robot, offset, rotating, slot } = this.selected; if (rotating) { robot.r = Math.atan2(point[1] - robot.y, point[0] - robot.x) + (isBlue(slot) ? Math.PI : 0); } else { robot.x = point[0] + offset[0]; robot.y = point[1] + offset[1]; } this.drawItems(); }
  private toggleCheckbox(point: Point): void { const phase = this.phase(); if (!phase) return; const index = phase.checkboxes.findIndex(([x, y]) => Math.abs(x - point[0]) <= 60 && Math.abs(y - point[1]) <= 60); if (index >= 0) { const before = phase.checkboxes[index][3]; phase.checkboxes[index][3] = !before; this.redrawDrawing(); this.record({ kind: "checkbox-toggle", index, before, after: !before }, "checkbox"); } else { const checkbox: CheckboxAnnotation = [point[0], point[1], this.color, false]; phase.checkboxes.push(checkbox); this.redrawDrawing(); this.record({ kind: "checkbox-add", checkbox }, "checkbox"); } }
  private eraseSegment(start: Point, end: Point, erased: Extract<Action, { kind: "erase" }>): void { const phase = this.phase(); if (!phase) return; const radius = 10; let changed = false; for (let index = phase.drawing.length - 1; index >= 0; index--) { const stroke = phase.drawing[index]; if (!segmentTouchesBounds(start, end, phase.drawingBBox[index] ?? strokeBounds(stroke), radius)) continue; const points = stroke.slice(1) as Point[]; const hit = points.length === 1 ? distanceToSegment(points[0], start, end) <= radius + 5 : points.slice(1).some((point, i) => segmentsIntersect(start, end, points[i], point, radius)); if (hit) { phase.drawing.splice(index, 1); phase.drawingBBox.splice(index, 1); erased.strokes.push({ index, stroke }); changed = true; } }
    for (let index = phase.checkboxes.length - 1; index >= 0; index--) { const checkbox = phase.checkboxes[index]; if (distanceToSegment([checkbox[0], checkbox[1]], start, end) <= 75 + radius) { phase.checkboxes.splice(index, 1); erased.checkboxes.push({ index, checkbox }); changed = true; } }
    if (changed) this.redrawDrawing(); }
}

export function createWhiteboardController(options: WhiteboardControllerOptions = {}): WhiteboardController { return new WhiteboardController(options); }
