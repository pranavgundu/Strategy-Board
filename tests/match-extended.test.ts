import { describe, expect, it } from "vitest";
import { Match } from "../src/match.ts";

describe("Match construction", () => {
  it("generates a UUID when no id is provided", () => {
    const m1 = new Match("Q1", "1", "2", "3", "4", "5", "6");
    const m2 = new Match("Q2", "1", "2", "3", "4", "5", "6");
    expect(m1.id).toBeTruthy();
    expect(m2.id).toBeTruthy();
    expect(m1.id).not.toBe(m2.id);
  });

  it("uses provided id", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6", "my-id");
    expect(m.id).toBe("my-id");
  });

  it("uses 2025 positions for year 2025", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6", undefined, undefined, undefined, undefined, 2025);
    expect(m.auto.redOneRobot.x).toBe(2055);
    expect(m.auto.blueOneRobot.x).toBe(1455);
  });

  it("initializes all four phases with empty drawings", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    for (const phase of [m.auto, m.teleop, m.endgame, m.notes]) {
      expect(phase.drawing).toEqual([]);
      expect(phase.drawingBBox).toEqual([]);
      expect(phase.checkboxes).toEqual([]);
    }
  });

  it("initializes all robots with default dimensions", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    const robots = [
      m.auto.redOneRobot, m.auto.redTwoRobot, m.auto.redThreeRobot,
      m.auto.blueOneRobot, m.auto.blueTwoRobot, m.auto.blueThreeRobot,
    ];
    for (const robot of robots) {
      expect(robot.w).toBe(152.4);
      expect(robot.h).toBe(152.4);
      expect(robot.r).toBe(0);
    }
  });
});

describe("Match packet serialization", () => {
  it("preserves all team numbers through round-trip", () => {
    const m = new Match("SF 2-1", "111", "222", "333", "444", "555", "666");
    const packet = m.getAsPacket();
    const parsed = Match.fromPacket(packet);

    expect(parsed.matchName).toBe("SF 2-1");
    expect(parsed.redOne).toBe("111");
    expect(parsed.redTwo).toBe("222");
    expect(parsed.redThree).toBe("333");
    expect(parsed.blueOne).toBe("444");
    expect(parsed.blueTwo).toBe("555");
    expect(parsed.blueThree).toBe("666");
  });

  it("preserves TBA metadata through round-trip", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6", "id", undefined, "2026miket", "2026miket_qm1", 2026);
    const packet = m.getAsPacket();
    const parsed = Match.fromPacket(packet);

    expect(parsed.tbaEventKey).toBe("2026miket");
    expect(parsed.tbaMatchKey).toBe("2026miket_qm1");
    expect(parsed.tbaYear).toBe(2026);
  });

  it("rounds robot rotation to 2 decimal places in packet", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    m.auto.redOneRobot.r = 1.23456789;
    const packet = m.getAsPacket();
    expect(packet[8][1][0][2]).toBe(1.23);
  });

  it("rounds robot dimensions to 1 decimal place in packet", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    m.auto.redOneRobot.w = 123.456;
    m.auto.redOneRobot.h = 78.951;
    const packet = m.getAsPacket();
    expect(packet[8][0][0][0]).toBe(123.5);
    expect(packet[8][0][0][1]).toBe(79);
  });

  it("preserves drawing strokes through round-trip", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    m.auto.drawing = [[2, [100, 200], [300, 400], [500, 600]]];
    m.auto.drawingBBox = [[50, 150, 550, 650]];

    const parsed = Match.fromPacket(m.getAsPacket());
    expect(parsed.auto.drawing).toEqual([[2, [100, 200], [300, 400], [500, 600]]]);
    expect(parsed.auto.drawingBBox).toEqual([[50, 150, 550, 650]]);
  });

  it("preserves checkbox annotations through round-trip", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    m.teleop.checkboxes = [[100, 200, 0, true], [300, 400, 1, false]];

    const parsed = Match.fromPacket(m.getAsPacket());
    expect(parsed.teleop.checkboxes).toEqual([[100, 200, 0, true], [300, 400, 1, false]]);
  });

  it("preserves fieldMetadata through round-trip", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    m.fieldMetadata = { selectedFieldYear: 2025 };

    const parsed = Match.fromPacket(m.getAsPacket());
    expect(parsed.fieldMetadata).toEqual({ selectedFieldYear: 2025 });
  });

  it("handles null fieldMetadata", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6");
    const parsed = Match.fromPacket(m.getAsPacket());
    expect(parsed.fieldMetadata).toBeUndefined();
  });
});

describe("Match with custom options", () => {
  it("applies custom robot positions and dimensions via options", () => {
    const m = new Match("Q1", "1", "2", "3", "4", "5", "6", "id", {
      dim: {
        r1: { w: 100, h: 100 },
        r2: { w: 110, h: 110 },
        r3: { w: 120, h: 120 },
        b1: { w: 130, h: 130 },
        b2: { w: 140, h: 140 },
        b3: { w: 150, h: 150 },
      },
      a: {
        r1: { x: 10, y: 20, r: 0.5 },
        r2: { x: 30, y: 40, r: 0 },
        r3: { x: 50, y: 60, r: 0 },
        b1: { x: 70, y: 80, r: 0 },
        b2: { x: 90, y: 100, r: 0 },
        b3: { x: 110, y: 120, r: 0 },
        d: [[1, [5, 5]]],
        dx: [[0, 0, 10, 10]],
        cb: [[10, 20, 0, true]],
      },
      t: {
        r1: { x: 0, y: 0, r: 0 },
        r2: { x: 0, y: 0, r: 0 },
        r3: { x: 0, y: 0, r: 0 },
        b1: { x: 0, y: 0, r: 0 },
        b2: { x: 0, y: 0, r: 0 },
        b3: { x: 0, y: 0, r: 0 },
        d: [],
        dx: [],
      },
      e: {
        r1: { x: 0, y: 0, r: 0 },
        r2: { x: 0, y: 0, r: 0 },
        r3: { x: 0, y: 0, r: 0 },
        b1: { x: 0, y: 0, r: 0 },
        b2: { x: 0, y: 0, r: 0 },
        b3: { x: 0, y: 0, r: 0 },
        d: [],
        dx: [],
      },
    });

    expect(m.auto.redOneRobot.x).toBe(10);
    expect(m.auto.redOneRobot.y).toBe(20);
    expect(m.auto.redOneRobot.r).toBe(0.5);
    expect(m.auto.redOneRobot.w).toBe(100);
    expect(m.auto.blueThreeRobot.w).toBe(150);
    expect(m.auto.drawing).toEqual([[1, [5, 5]]]);
    expect(m.auto.checkboxes).toEqual([[10, 20, 0, true]]);
    // teleop should have empty checkboxes since cb not provided
    expect(m.teleop.checkboxes).toEqual([]);
  });
});

describe("Match.isFromTBA", () => {
  it("requires all three TBA fields", () => {
    expect(new Match("Q1", "1", "2", "3", "4", "5", "6", undefined, undefined, "ev", "mk").isFromTBA()).toBe(false);
    expect(new Match("Q1", "1", "2", "3", "4", "5", "6", undefined, undefined, "ev", undefined, 2026).isFromTBA()).toBe(false);
    expect(new Match("Q1", "1", "2", "3", "4", "5", "6", undefined, undefined, "ev", "mk", 2026).isFromTBA()).toBe(true);
  });
});

describe("Match.updateInfo", () => {
  it("does not affect other match properties", () => {
    const m = new Match("Old", "1", "2", "3", "4", "5", "6", "stable-id", undefined, "2026miket", "2026miket_qm1", 2026);
    m.auto.drawing = [[0, [1, 2]]];

    m.updateInfo("New", "10", "20", "30", "40", "50", "60");

    expect(m.id).toBe("stable-id");
    expect(m.tbaEventKey).toBe("2026miket");
    expect(m.auto.drawing).toEqual([[0, [1, 2]]]);
  });
});
