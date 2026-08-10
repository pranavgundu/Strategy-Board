/** Pure geometry helpers shared by the canvas controller and unit tests. */
export type Point = readonly [number, number];
export type BoundingBox = readonly [number, number, number, number];

export function canvasLayout(
  wrapperWidth: number,
  wrapperHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fieldYear?: number,
): { scale: number; left: number; top: number } | null {
  if (
    !Number.isFinite(wrapperWidth) || !Number.isFinite(wrapperHeight) ||
    !Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) ||
    wrapperWidth <= 0 || wrapperHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0
  ) return null;

  const scale = Math.min(wrapperWidth / canvasWidth, wrapperHeight / canvasHeight);
  const scaledHeight = canvasHeight * scale;
  const left = (wrapperWidth - canvasWidth * scale) / 2;
  const centeredTop = (wrapperHeight - scaledHeight) / 2;
  const crop = fieldYear === 2026 ? -30 : 0;
  return { scale, left, top: Math.max(0, Math.min(centeredTop + crop, Math.max(0, wrapperHeight - scaledHeight))) };
}

export function pointInRotatedRect(
  point: Point,
  center: Point,
  width: number,
  height: number,
  rotation: number,
): boolean {
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  const x = cos * dx - sin * dy;
  const y = sin * dx + cos * dy;
  return x >= -width / 2 && x <= width / 2 && y >= -height / 2 && y <= height / 2;
}

export function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

export function strokeBounds(stroke: readonly [number, ...Point[]]): [number, number, number, number] {
  const first = stroke[1];
  let minX = first[0]; let minY = first[1]; let maxX = first[0]; let maxY = first[1];
  for (const point of stroke.slice(2) as Point[]) {
    minX = Math.min(minX, point[0]); minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]); maxY = Math.max(maxY, point[1]);
  }
  // A one-point stroke is painted as a 5px radius dot.
  if (stroke.length === 2) return [minX - 5, minY - 5, maxX + 5, maxY + 5];
  return [minX, minY, maxX, maxY];
}

export function segmentTouchesBounds(start: Point, end: Point, bounds: BoundingBox, padding = 0): boolean {
  const [minX, minY, maxX, maxY] = bounds;
  const left = minX - padding; const top = minY - padding;
  const right = maxX + padding; const bottom = maxY + padding;
  if ((start[0] >= left && start[0] <= right && start[1] >= top && start[1] <= bottom) ||
      (end[0] >= left && end[0] <= right && end[1] >= top && end[1] <= bottom)) return true;
  return segmentsIntersect(start, end, [left, top], [right, top]) ||
    segmentsIntersect(start, end, [left, bottom], [right, bottom]) ||
    segmentsIntersect(start, end, [left, top], [left, bottom]) ||
    segmentsIntersect(start, end, [right, top], [right, bottom]);
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point, tolerance = 0): boolean {
  const cross = (p: Point, q: Point, r: Point) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c); const abD = cross(a, b, d);
  const cdA = cross(c, d, a); const cdB = cross(c, d, b);
  if (((abC >= 0 && abD <= 0) || (abC <= 0 && abD >= 0)) && ((cdA >= 0 && cdB <= 0) || (cdA <= 0 && cdB >= 0))) return true;
  return tolerance > 0 && [distanceToSegment(a, c, d), distanceToSegment(b, c, d), distanceToSegment(c, a, b), distanceToSegment(d, a, b)].some((distance) => distance <= tolerance);
}
