import { describe, expect, it } from "vitest";

import { whiteboardMatchFromPacket, writeWhiteboardPacket } from "../src/lib/whiteboard/packet";

function phase(rotation = 0): unknown[] {
  return [
    [10, 20, rotation], [30, 40, 0], [50, 60, 0], [70, 80, 0], [90, 100, 0], [110, 120, 0],
    [[2, [12, 13], [20, 21]]], [[12, 13, 20, 21]], [[25, 30, 1, true]],
  ];
}

function packet(): unknown[] {
  const dimensions = [[101, 102], [103, 104], [105, 106], [107, 108], [109, 110], [111, 112]];
  return [
    "Quals 12", "1", "2", "3", "4", "5", "6", "match-id", [dimensions, phase(12.345), phase(), phase(), phase(), phase()],
    "2026test", "2026test_qm12", 2026, { selectedFieldYear: 2026, futureMetadata: "preserved" },
  ];
}

describe("whiteboard packet codec", () => {
  it("round-trips board state without mutating source or losing non-canvas schema fields", () => {
    const source = packet();
    const original = structuredClone(source);
    const match = whiteboardMatchFromPacket(source);

    expect(match.auto.redOneRobot).toEqual({ x: 10, y: 20, r: 12.345, w: 101, h: 102 });
    expect(match.auto.drawing).toEqual([[2, [12, 13], [20, 21]]]);
    expect(match.fieldMetadata).toEqual({ selectedFieldYear: 2026, futureMetadata: "preserved" });

    match.auto.redOneRobot.x = 777;
    match.auto.redOneRobot.r = 45.678;
    match.notes.drawing.push([4, [1, 2]]);
    match.transition.checkboxes[0][3] = false;
    const written = writeWhiteboardPacket(source, match);

    expect(source).toEqual(original);
    expect(written).not.toBe(source);
    expect(written.slice(0, 8)).toEqual(original.slice(0, 8));
    expect(written.slice(9)).toEqual(original.slice(9));
    expect((written[8] as unknown[])[0]).toEqual((original[8] as unknown[])[0]);
    expect(((written[8] as unknown[])[1] as unknown[])[0]).toEqual([777, 20, 45.68]);
    expect((((written[8] as unknown[])[4] as unknown[])[6] as unknown[])).toContainEqual([4, [1, 2]]);
    expect((((written[8] as unknown[])[5] as unknown[])[8] as unknown[])[0]).toEqual([25, 30, 1, false]);
  });

  it("repairs omitted legacy bounding boxes from the stroke geometry", () => {
    const source = packet();
    ((source[8] as unknown[])[1] as unknown[])[7] = [];

    const match = whiteboardMatchFromPacket(source);

    expect(match.auto.drawingBBox).toEqual([[12, 13, 20, 21]]);
  });
});
