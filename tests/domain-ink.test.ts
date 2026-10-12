import { describe, expect, it } from "vitest";

import { defaultInk, inkColor, inkStation, isStrokeErasable, isStrokeVisible, NEUTRAL_INK, newMatchPacket, officialInkColor, STATIONS, teamInk, type Lineup } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";
import { normalizeBrowserMatchPacket } from "$lib/native/web";
import { whiteboardMatchFromPacket } from "$lib/whiteboard/packet";

const lineup: Lineup = { redOne: "1690", redTwo: "2231", redThree: "11480", blueOne: "4590", blueTwo: "1577", blueThree: "" };

describe("Team Ink", () => {
  it("gives each Station its own Ink far above the official five-color palette, with Neutral as 0", () => {
    const inks = STATIONS.map(teamInk);

    expect(new Set(inks).size).toBe(6);
    expect(Math.min(...inks)).toBeGreaterThan(100);
    expect(STATIONS.map((station) => inkStation(teamInk(station)))).toEqual([...STATIONS]);
    expect(NEUTRAL_INK).toBe(0);
    expect(inkStation(NEUTRAL_INK)).toBeNull();
  });

  it("draws a Team Ink Stroke in the current Team Color of the team in its Station", () => {
    expect(inkColor(teamInk("redOne"), lineup, {})).toBe("#0100fc");
    expect(inkColor(teamInk("redOne"), lineup, { "1690": "#33aaff" })).toBe("#33aaff");
    expect(inkColor(teamInk("redOne"), { ...lineup, redOne: "11480" }, {})).toBe("#99b125");
  });

  it("draws the Strokes of an empty Station in Neutral white", () => {
    expect(inkColor(teamInk("blueThree"), lineup, {})).toBe("#ffffff");
  });

  it("keeps the legacy palette colors for old Strokes, which count as Neutral Ink", () => {
    expect([0, 1, 2, 3, 4].map((ink) => inkColor(ink, lineup, {}))).toEqual(["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"]);
    expect([1, 2, 3, 4].map(inkStation)).toEqual([null, null, null, null]);
  });

  it("starts on Our Team's Station when 1690 is in the Match, and on Neutral otherwise", () => {
    expect(defaultInk({ ...lineup, redOne: "254", blueTwo: "1690" })).toBe(teamInk("blueTwo"));
    expect(defaultInk({ ...lineup, redOne: "254" })).toBe(NEUTRAL_INK);
  });
});

describe("Team Ink compatibility with the official app", () => {
  function inkedPacket(): MatchPacket {
    const packet = newMatchPacket({ matchName: "Quals 9", redTeams: ["1690", "5635", "4416"], blueTeams: ["9739", "4586", "3339"], tbaYear: 2026 }, "inked");
    const body = packet[8] as unknown[][];
    body[1][6] = [[teamInk("redOne"), [2400, 1300], [2000, 1000]], [3, [100, 100], [200, 200]]];
    body[1][7] = [[2000, 1000, 2400, 1300], [100, 100, 200, 200]];
    body[4][6] = [[teamInk("blueThree"), [500, 500], [600, 650]]];
    body[4][7] = [[500, 500, 600, 650]];
    return packet;
  }

  it("keeps Team Ink through the existing packet codec and the browser runtime's normalization", () => {
    const packet = inkedPacket();

    expect(whiteboardMatchFromPacket(packet).auto.drawing.map((stroke) => stroke[0])).toEqual([teamInk("redOne"), 3]);
    expect(normalizeBrowserMatchPacket(structuredClone(packet))).toEqual(packet);
  });

  it("shows Team Ink as plain white in the official app's palette", () => {
    expect(STATIONS.map((station) => officialInkColor(teamInk(station)))).toEqual(Array(6).fill("#ffffff"));
  });
});

describe("Hidden Teams", () => {
  const hidden = (...teams: string[]) => new Set(teams);

  it("hide only the Strokes in the Team Ink of a hidden team, and keep them out of the eraser's reach", () => {
    for (const check of [isStrokeVisible, isStrokeErasable]) {
      expect(check(teamInk("redOne"), lineup, hidden("1690"))).toBe(false);
      expect(check(teamInk("redTwo"), lineup, hidden("1690"))).toBe(true);
      expect(check(teamInk("blueOne"), lineup, hidden("1690", "4590"))).toBe(false);
      expect(check(teamInk("redOne"), lineup, hidden())).toBe(true);
    }
  });

  it("never hide Neutral Ink, including the legacy colors", () => {
    const everyone = hidden("1690", "2231", "11480", "4590", "1577");

    expect([0, 1, 2, 3, 4].map((ink) => isStrokeVisible(ink, lineup, everyone))).toEqual([true, true, true, true, true]);
    expect([0, 1, 2, 3, 4].map((ink) => isStrokeErasable(ink, lineup, everyone))).toEqual([true, true, true, true, true]);
  });

  it("follow the team, not the Station, and leave the white Strokes of an empty Station visible", () => {
    const moved = { ...lineup, redOne: "2231", redTwo: "1690" };

    expect(isStrokeVisible(teamInk("redTwo"), moved, hidden("1690"))).toBe(false);
    expect(isStrokeVisible(teamInk("redOne"), moved, hidden("1690"))).toBe(true);
    expect(isStrokeVisible(teamInk("blueThree"), lineup, hidden("1690", "4590"))).toBe(true);
  });
});
