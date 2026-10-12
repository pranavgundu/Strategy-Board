import { describe, expect, it } from "vitest";

import { addCommonPath, applyCommonPath, commonPathChoices, deleteCommonPath, emptyBoardConfig, NEUTRAL_INK, newMatchPacket, packetLineup, readBoardConfig, renameCommonPath, retagCommonPath, saveCommonPath, teamInk, type CommonPath } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";

/** 1690 in Red 1 has a two-Stroke auto and one teleop Stroke; 2231 and a Neutral note share the auto. */
function plannedMatch(): MatchPacket {
  const packet = newMatchPacket({ matchName: "Quals 9", redTeams: ["1690", "2231", "11480"], blueTeams: ["4590", "1577", "2679"], tbaYear: 2026 }, "match");
  const body = packet[8] as unknown[][];
  body[1][0] = [2900, 1300, 0.5];
  body[1][6] = [
    [teamInk("redOne"), [2900, 1300], [2500, 1100]],
    [teamInk("redTwo"), [2700, 800], [2400, 800]],
    [NEUTRAL_INK, [1700, 800], [1800, 800]],
    [teamInk("redOne"), [2500, 1100], [2200, 1250], [2000, 1300]],
  ];
  body[1][7] = [[2500, 1100, 2900, 1300], [2400, 800, 2700, 800], [1700, 800, 1800, 800], [2000, 1100, 2500, 1300]];
  body[2][6] = [[teamInk("redOne"), [100, 100], [200, 200]]];
  body[2][7] = [[100, 100, 200, 200]];
  return packet;
}

function laterMatch(): MatchPacket {
  return newMatchPacket({ matchName: "Quals 20", redTeams: ["254", "1690", "2231"], blueTeams: ["4590", "1577", "2679"], tbaYear: 2026 }, "later");
}

const threePiece = () => saveCommonPath(plannedMatch(), "redOne", "auto", { id: "path-1", name: "Three piece left", tag: "1690" });

describe("Common Paths", () => {
  it("save one team's Strokes from the Phase on screen with its Bumper Sprite pose", () => {
    const path = saveCommonPath(plannedMatch(), "redOne", "auto", { id: "path-1", name: "Three piece left", tag: "1690" });

    expect(path).toEqual({
      id: "path-1", name: "Three piece left", tag: "1690", fieldYear: 2026, phase: "auto", alliance: "red",
      strokes: [[[2900, 1300], [2500, 1100]], [[2500, 1100], [2200, 1250], [2000, 1300]]],
      pose: { x: 2900, y: 1300, r: 0.5 },
    });
  });

  it("paste into the Phase on screen in the target Station's Team Ink and move that Station's sprite to the saved pose", () => {
    const before = laterMatch();

    const after = applyCommonPath(before, threePiece(), "redTwo", "teleop");

    const teleop = (after[8] as unknown[][])[2];
    expect(teleop[6]).toEqual([
      [teamInk("redTwo"), [2900, 1300], [2500, 1100]],
      [teamInk("redTwo"), [2500, 1100], [2200, 1250], [2000, 1300]],
    ]);
    expect(teleop[7]).toEqual([[2500, 1100, 2900, 1300], [2000, 1100, 2500, 1300]]);
    expect(teleop[1]).toEqual([2900, 1300, 0.5]);
    expect(teleop.slice(0, 6).filter((_, index) => index !== 1)).toEqual((before[8] as unknown[][])[2].slice(0, 6).filter((_, index) => index !== 1));
    expect((after[8] as unknown[][])[1]).toEqual((before[8] as unknown[][])[1]);
  });

  it("turn the Strokes and pose half a turn about the field center when applied to the other alliance", () => {
    const after = applyCommonPath(laterMatch(), threePiece(), "blueTwo", "auto");

    const auto = (after[8] as unknown[][])[1];
    expect(auto[6]).toEqual([
      [teamInk("blueTwo"), [610, 310], [1010, 510]],
      [teamInk("blueTwo"), [1010, 510], [1310, 360], [1510, 310]],
    ]);
    expect(auto[4]).toEqual([610, 310, 0.5]);
  });

  it("offer only the Match's field year, paths from the Phase on screen first, and tagged teams in the Match first with their Station chosen", () => {
    const base = threePiece();
    const paths: CommonPath[] = [
      { ...base, id: "generic-defense", name: "Generic defense", tag: null, phase: "teleop" },
      { ...base, id: "ours", name: "1690 three piece", tag: "1690", phase: "auto" },
      { ...base, id: "partner", name: "4590 two piece", tag: "4590", phase: "auto" },
      { ...base, id: "last-year", name: "Old reef cycle", tag: "1690", phase: "auto", fieldYear: 2025 },
      { ...base, id: "generic-auto", name: "Generic auto", tag: null, phase: "auto" },
      { ...base, id: "absent", name: "6738 auto", tag: "6738", phase: "auto" },
      { ...base, id: "our-defense", name: "1690 defense", tag: "1690", phase: "teleop" },
    ];

    const choices = commonPathChoices(paths, { fieldYear: 2026, phase: "auto", lineup: packetLineup(laterMatch()) });

    expect(choices.map(({ path, station }) => [path.id, station])).toEqual([
      ["ours", "redTwo"], ["partner", "blueOne"],
      ["absent", null], ["generic-auto", null],
      ["our-defense", "redTwo"],
      ["generic-defense", null],
    ]);
  });

  it("paste independent copies, so changing a pasted path never changes the saved one", () => {
    const path = threePiece();
    const saved = structuredClone(path);

    const after = applyCommonPath(laterMatch(), path, "redTwo", "auto");
    (((after[8] as unknown[][])[1][6] as unknown[][])[0][1] as number[])[0] = 9999;

    expect(path).toEqual(saved);
  });

  it("are kept on the device in the Board Config with their field year, source Phase, and source alliance", () => {
    const config = addCommonPath(emptyBoardConfig(), threePiece());
    const stored = JSON.parse(JSON.stringify(config));
    stored.commonPaths.push({ id: "broken", name: "No strokes or pose" });

    expect(readBoardConfig(stored).commonPaths).toEqual([threePiece()]);
  });
});

describe("The Common Path library", () => {
  const library = () => addCommonPath(addCommonPath(emptyBoardConfig(), threePiece()), { ...threePiece(), id: "path-2", name: "Defense lane", tag: null, phase: "teleop" });

  it("renames a path and changes nothing else about it", () => {
    const config = renameCommonPath(library(), "path-1", "Three piece amp side");

    expect(config.commonPaths[0]).toEqual({ ...threePiece(), name: "Three piece amp side" });
    expect(config.commonPaths[1]).toEqual(library().commonPaths[1]);
  });

  it("retags a path to another team or to any robot", () => {
    expect(retagCommonPath(library(), "path-2", "0254").commonPaths[1].tag).toBe("254");
    expect(retagCommonPath(library(), "path-1", null).commonPaths[0].tag).toBeNull();
    expect(() => retagCommonPath(library(), "path-1", "not a team")).toThrow();
  });

  it("deletes a path without touching the Matches it was already pasted into", () => {
    const pasted = applyCommonPath(laterMatch(), threePiece(), "redTwo", "auto");
    const before = structuredClone(pasted);

    const config = deleteCommonPath(library(), "path-1");

    expect(config.commonPaths.map((path) => path.id)).toEqual(["path-2"]);
    expect(pasted).toEqual(before);
  });
});
