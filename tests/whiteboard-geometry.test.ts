import { describe, expect, it } from "vitest";

import { canvasLayout, segmentTouchesBounds, segmentsIntersect, strokeBounds } from "../src/lib/whiteboard/geometry";

describe("whiteboard eraser geometry", () => {
  it("identifies direct and tolerance-based eraser intersections", () => {
    expect(segmentsIntersect([0, 0], [20, 20], [0, 20], [20, 0])).toBe(true);
    expect(segmentsIntersect([0, 0], [20, 0], [0, 3], [20, 3])).toBe(false);
    expect(segmentsIntersect([0, 0], [20, 0], [0, 3], [20, 3], 3)).toBe(true);
  });

  it("uses padded stroke bounds before detailed eraser segment checks", () => {
    expect(segmentTouchesBounds([0, 0], [30, 0], [10, 5, 20, 15])).toBe(false);
    expect(segmentTouchesBounds([0, 0], [30, 0], [10, 5, 20, 15], 5)).toBe(true);
    expect(strokeBounds([1, [50, 60]])).toEqual([45, 55, 55, 65]);
  });

  it("keeps canvas layout safe for invalid sizes and 2026 crop offsets", () => {
    expect(canvasLayout(0, 600, 3510, 1610)).toBeNull();
    const layout = canvasLayout(1000, 600, 3510, 1610, 2026);
    expect(layout?.scale).toBeCloseTo(0.2849);
    expect(layout?.left).toBe(0);
    expect(layout?.top).toBeCloseTo(40.6553);
  });
});
