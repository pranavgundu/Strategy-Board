import { describe, expect, it } from "vitest";
import { Match } from "../src/match.ts";

describe("Match", () => {
  it("uses year-specific default robot positions", () => {
    const match = new Match(
      "Q1",
      "111",
      "222",
      "333",
      "444",
      "555",
      "666",
      "fixed-id",
      undefined,
      undefined,
      undefined,
      2026,
    );

    expect(match.auto.redOneRobot.x).toBe(2680);
    expect(match.auto.blueOneRobot.x).toBe(830);
    expect(match.auto.redOneRobot.w).toBe(152.4);
    expect(match.auto.redOneRobot.h).toBe(152.4);
  });

  it("round-trips packet data including notes and metadata", () => {
    const original = new Match(
      "Final",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "packet-id",
      undefined,
      "2026miket",
      "2026miket_qm1",
      2026,
    );

    original.auto.redOneRobot.r = 12.3456;
    original.teleop.drawing = [[0, [10, 11], [12, 13]]];
    original.teleop.drawingBBox = [[1, 2, 3, 4]];
    original.notes.checkboxes = [[10, 20, 1, true]];
    original.fieldMetadata = { selectedFieldYear: 2026 };

    const packet = original.getAsPacket();
    const parsed = Match.fromPacket(packet);

    expect(parsed.id).toBe("packet-id");
    expect(parsed.teleop.drawing).toEqual([[0, [10, 11], [12, 13]]]);
    expect(parsed.teleop.drawingBBox).toEqual([[1, 2, 3, 4]]);
    expect(parsed.notes.checkboxes).toEqual([[10, 20, 1, true]]);
    expect(parsed.fieldMetadata).toEqual({ selectedFieldYear: 2026 });
    expect(parsed.auto.redOneRobot.r).toBe(12.35);
  });

  it("detects whether a match came from TBA", () => {
    const local = new Match("Q2", "1", "2", "3", "4", "5", "6");
    const tba = new Match(
      "Q3",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      undefined,
      undefined,
      "2026miket",
      "2026miket_qm2",
      2026,
    );

    expect(local.isFromTBA()).toBe(false);
    expect(tba.isFromTBA()).toBe(true);
  });

  it("updates match info fields", () => {
    const match = new Match("Old", "1", "2", "3", "4", "5", "6");

    match.updateInfo("New", "10", "20", "30", "40", "50", "60");

    expect(match.matchName).toBe("New");
    expect(match.redOne).toBe("10");
    expect(match.redTwo).toBe("20");
    expect(match.redThree).toBe("30");
    expect(match.blueOne).toBe("40");
    expect(match.blueTwo).toBe("50");
    expect(match.blueThree).toBe("60");
  });

  it("supports legacy packets without notes and fieldMetadata", () => {
    const original = new Match("Legacy", "11", "22", "33", "44", "55", "66");
    const packet = original.getAsPacket();
    const legacyPacket = packet.slice(0, 12);

    const parsed = Match.fromPacket(legacyPacket);

    expect(parsed.notes.checkboxes).toEqual([]);
    expect(parsed.fieldMetadata).toBeUndefined();
  });

  it("defaults missing checkbox arrays to empty arrays during deserialization", () => {
    const original = new Match("Checkbox", "1", "2", "3", "4", "5", "6");
    const packet = original.getAsPacket();

    delete packet[8][1][8];
    delete packet[8][2][8];
    delete packet[8][3][8];
    delete packet[8][4][8];

    const parsed = Match.fromPacket(packet);

    expect(parsed.auto.checkboxes).toEqual([]);
    expect(parsed.teleop.checkboxes).toEqual([]);
    expect(parsed.endgame.checkboxes).toEqual([]);
    expect(parsed.notes.checkboxes).toEqual([]);
  });
});
