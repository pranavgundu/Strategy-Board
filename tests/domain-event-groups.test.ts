import { describe, expect, it } from "vitest";

import { dismissMatches, groupMatchesByEvent, newMatchPacket, parseNexusEvent, planSync, restoreDismissed, toWhatIfMatch, type DismissedMatches } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";

import iscmp from "./fixtures/nexus-2026iscmp.json";
import isde1 from "./fixtures/nexus-2026isde1.json";

let ids = 0;
const newId = () => `match-${++ids}`;
const schedule = parseNexusEvent(isde1)!;
const sync = (packets: readonly MatchPacket[], dismissed: DismissedMatches = {}) => planSync({ packets, schedule, dismissed, newId });
const named = (packets: readonly MatchPacket[], name: string) => packets.find((packet) => packet[0] === name)!;

describe("Dismissed Matches", () => {
  it("keep a deleted Synced Match from coming back on the next sync", () => {
    const board = sync([]).add;
    const deleted = named(board, "Practice 3");

    const dismissed = dismissMatches({}, [deleted]);
    const next = sync(board.filter((packet) => packet !== deleted), dismissed);

    expect(dismissed).toEqual({ "2026isde1": ["2026isde1:practice:3"] });
    expect(next.add).toEqual([]);
  });

  it("are recorded for every Synced Match of an event deleted as a whole", () => {
    const board = sync([]).add;

    const dismissed = dismissMatches({}, board);

    expect(dismissed["2026isde1"]).toHaveLength(20);
    expect(sync([], dismissed).add).toEqual([]);
  });

  it("can be restored per event, so sync adds them again", () => {
    const board = sync([]).add;
    const dismissed = dismissMatches({ "2026iscmp": ["2026iscmp:qual:2"] }, [named(board, "Quals 13"), named(board, "Final 1")]);

    const restored = restoreDismissed(dismissed, "2026isde1");

    expect(restored).toEqual({ "2026iscmp": ["2026iscmp:qual:2"] });
    expect(sync(board.filter((packet) => !["Quals 13", "Final 1"].includes(packet[0])), restored).add.map((packet) => packet[0])).toEqual(["Quals 13", "Final 1"]);
  });

  it("never include What-if Matches", () => {
    const whatIf = toWhatIfMatch(named(sync([]).add, "Quals 2"));
    const scrimmage = newMatchPacket({ matchName: "Scrimmage", redTeams: ["1690", "", ""], blueTeams: ["", "", ""] }, "new");

    expect(dismissMatches({}, [whatIf, scrimmage])).toEqual({});
  });
});

describe("Home event groups", () => {
  it("put the Current Event first, then other events, most recent first, then What-if Matches made with New", () => {
    const district = sync([]).add.slice(0, 2);
    const championship = planSync({ packets: [], schedule: parseNexusEvent(iscmp)!, newId }).add.slice(0, 2);
    const copy = toWhatIfMatch(district[0]);
    copy[7] = "copy";
    const scrimmage = newMatchPacket({ matchName: "Scrimmage", redTeams: ["1690", "", ""], blueTeams: ["", "", ""] }, "scrimmage");
    const offseason = newMatchPacket({ matchName: "Imported", redTeams: ["1", "2", "3"], blueTeams: ["4", "5", "6"], tbaEventKey: "2025isos" }, "imported");

    const groups = groupMatchesByEvent([scrimmage, offseason, ...district, copy, ...championship], "2026isde1");

    expect(groups.map((group) => [group.eventKey, group.current, group.packets.map((packet) => packet[7])])).toEqual([
      ["2026isde1", true, [district[0][7], district[1][7], "copy"]],
      ["2026iscmp", false, championship.map((packet) => packet[7])],
      ["2025isos", false, ["imported"]],
      [null, false, ["scrimmage"]],
    ]);
  });
});
