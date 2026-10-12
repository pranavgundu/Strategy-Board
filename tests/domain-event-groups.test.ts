import { describe, expect, it } from "vitest";

import { dismissMatches, groupMatchesByEvent, homeEventGroups, newMatchPacket, parseNexusEvent, planSync, restoreDismissed, toWhatIfMatch, type DismissedMatches } from "$lib/domain";
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

describe("Home event groups without a Current Event", () => {
  it("still put What-if Matches made with New after every event", () => {
    const district = sync([]).add.slice(0, 1);
    const scrimmage = newMatchPacket({ matchName: "Scrimmage", redTeams: ["1690", "", ""], blueTeams: ["", "", ""] }, "scrimmage");

    const groups = groupMatchesByEvent([scrimmage, ...district], null);

    expect(groups.map((group) => [group.eventKey, group.current])).toEqual([["2026isde1", false], [null, false]]);
  });
});

describe("Home event groups with Queue Status", () => {
  it("pin Our Team's Next Match first in schedule order and give each match its Queue Status", () => {
    const board = sync([]).add;
    const plan = sync(board);
    const championship = planSync({ packets: [], schedule: parseNexusEvent(iscmp)!, newId }).add.slice(0, 1);

    const groups = homeEventGroups([...championship, ...[...board].reverse()], {
      currentEventKey: "2026isde1",
      queue: { eventKey: "2026isde1", schedule: plan.schedule, nextMatch: plan.nextMatch },
      dismissed: {},
    });

    const [current, other] = groups;
    expect(current.matches.map((match) => match.packet[0])).toEqual([
      "Final 2", "Practice 3", "Practice 9", "Quals 2", "Quals 9", "Quals 13", "Quals 16", "Quals 19", "Quals 27", "Quals 32",
      "Quals 36", "Quals 41", "Quals 45", "Quals 50", "Quals 53", "Playoff 1", "Playoff 7", "Playoff 11", "Final 1", "Final 3",
    ]);
    expect(current.matches.filter((match) => match.next).map((match) => match.packet[0])).toEqual(["Final 2"]);
    expect(current.matches.at(-1)?.info?.status).toBe("Queuing soon");
    expect(other.matches.map((match) => [match.next, match.info])).toEqual([[false, null]]);
  });

  it("keep the Current Event when every match in it was deleted, so they can be restored", () => {
    const groups = homeEventGroups([], {
      currentEventKey: "2026isde1",
      queue: null,
      dismissed: { "2026isde1": ["2026isde1:qual:2", "2026isde1:qual:9"] },
    });

    expect(groups).toEqual([{ eventKey: "2026isde1", current: true, dismissedCount: 2, matches: [] }]);
  });
});
