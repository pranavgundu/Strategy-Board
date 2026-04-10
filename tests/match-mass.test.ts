import { describe, expect, it } from "vitest";
import { Match } from "../src/match.ts";

describe("Match mass metadata coverage", () => {
  const tbaMatrix = [
    [undefined, undefined, undefined, false],
    ["2026miket", undefined, undefined, false],
    [undefined, "2026miket_qm1", undefined, false],
    [undefined, undefined, 2026, false],
    ["2026miket", "2026miket_qm1", undefined, false],
    ["2026miket", undefined, 2026, false],
    [undefined, "2026miket_qm1", 2026, false],
    ["2026miket", "2026miket_qm1", 2026, true],
    ["", "2026miket_qm1", 2026, false],
    ["2026miket", "", 2026, false],
    ["2026miket", "2026miket_qm1", 0, false],
    ["2025oncmp", "2025oncmp_sf1m2", 2025, true],
  ] as const;

  it.each(tbaMatrix)(
    "isFromTBA=%s for event=%s match=%s year=%s",
    (eventKey, matchKey, year, expected) => {
      const match = new Match(
        "M",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "id",
        undefined,
        eventKey,
        matchKey,
        year as number | undefined,
      );
      expect(match.isFromTBA()).toBe(expected);
    },
  );
});

describe("Match mass updateInfo coverage", () => {
  const updateCases = [
    ["Quals 1", "111", "222", "333", "444", "555", "666"],
    ["Quals 2", "1", "2", "3", "4", "5", "6"],
    ["Semis 1-1", "254", "1678", "971", "1114", "2056", "148"],
    ["Finals 1-2", "6328", "4414", "118", "604", "1323", "3476"],
    ["Practice", "A", "B", "C", "D", "E", "F"],
    ["", "", "", "", "", "", ""],
    ["Long Name Match", "0001", "0002", "0003", "0004", "0005", "0006"],
    ["UnicodeSafe", "team-1", "team-2", "team-3", "team-4", "team-5", "team-6"],
    ["Elims", "r1", "r2", "r3", "b1", "b2", "b3"],
    ["District", "900", "901", "902", "903", "904", "905"],
  ] as const;

  it.each(updateCases)(
    "updates all visible fields for %s",
    (name, r1, r2, r3, b1, b2, b3) => {
      const match = new Match("Init", "1", "2", "3", "4", "5", "6", "id");
      match.updateInfo(name, r1, r2, r3, b1, b2, b3);

      expect(match.matchName).toBe(name);
      expect(match.redOne).toBe(r1);
      expect(match.redTwo).toBe(r2);
      expect(match.redThree).toBe(r3);
      expect(match.blueOne).toBe(b1);
      expect(match.blueTwo).toBe(b2);
      expect(match.blueThree).toBe(b3);
    },
  );
});

describe("Match mass serialization coverage", () => {
  const roundingCases = [
    [0.001, 0],
    [0.0049, 0],
    [0.005, 0.01],
    [1.234, 1.23],
    [1.235, 1.24],
    [-1.234, -1.23],
    [-1.235, -1.24],
    [89.999, 90],
    [180.126, 180.13],
    [359.994, 359.99],
  ] as const;

  it.each(roundingCases)("rounds auto redOne rotation %f -> %f", (input, expected) => {
    const match = new Match("M", "1", "2", "3", "4", "5", "6", "id");
    match.auto.redOneRobot.r = input;

    const packet = match.getAsPacket();
    expect(packet[8][1][0][2]).toBe(expected);
  });

  const sizeCases = [
    [152.44, 152.4],
    [152.45, 152.4],
    [152.46, 152.5],
    [0.04, 0],
    [0.05, 0.1],
    [1.14, 1.1],
    [1.15, 1.1],
    [1.16, 1.2],
    [300.04, 300],
    [300.05, 300.1],
  ] as const;

  it.each(sizeCases)("rounds auto redOne width %f -> %f", (input, expected) => {
    const match = new Match("M", "1", "2", "3", "4", "5", "6", "id");
    match.auto.redOneRobot.w = input;

    const packet = match.getAsPacket();
    expect(packet[8][0][0][0]).toBe(expected);
  });

  it("preserves fieldMetadata nullability in packets", () => {
    const a = new Match("A", "1", "2", "3", "4", "5", "6", "ida");
    const b = new Match("B", "1", "2", "3", "4", "5", "6", "idb");
    b.fieldMetadata = { selectedFieldYear: 2026 };

    const packetA = a.getAsPacket();
    const packetB = b.getAsPacket();

    expect(packetA[12]).toBeNull();
    expect(packetB[12]).toEqual({ selectedFieldYear: 2026 });
  });

  it("defaults checkbox arrays to empty when omitted in packet", () => {
    const packet = new Match("M", "1", "2", "3", "4", "5", "6", "id").getAsPacket();

    packet[8][1][8] = undefined;
    packet[8][2][8] = undefined;
    packet[8][3][8] = undefined;
    packet[8][4][8] = undefined;
    packet[8][5][8] = undefined;

    const hydrated = Match.fromPacket(packet);

    expect(hydrated.auto.checkboxes).toEqual([]);
    expect(hydrated.teleop.checkboxes).toEqual([]);
    expect(hydrated.endgame.checkboxes).toEqual([]);
    expect(hydrated.notes.checkboxes).toEqual([]);
    expect(hydrated.transition.checkboxes).toEqual([]);
  });
});
