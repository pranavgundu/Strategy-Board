import { describe, expect, it } from "vitest";

import { parseNexusEvent, planSync, readExtras, toWhatIfMatch, type EventSchedule } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";
import { normalizeBrowserMatchPacket } from "$lib/native/web";
import { whiteboardMatchFromPacket } from "$lib/whiteboard/packet";

import iscmp from "./fixtures/nexus-2026iscmp.json";
import isde1 from "./fixtures/nexus-2026isde1.json";

function idGenerator(): () => string {
  let next = 0;
  return () => `synced-${++next}`;
}

function schedule(json: unknown): EventSchedule {
  const parsed = parseNexusEvent(json);
  if (!parsed) throw new Error("expected a schedule");
  return parsed;
}

function sync(json: unknown, packets: readonly MatchPacket[] = []) {
  return planSync({ packets, schedule: schedule(json), newId: idGenerator() });
}

type NexusMatch = { label: string; status: string; redTeams: string[] | null; blueTeams: string[] | null; times: object };

function edited(json: { matches: NexusMatch[] } & object, edit: (matches: NexusMatch[]) => void): unknown {
  const copy = structuredClone(json);
  edit(copy.matches);
  return copy;
}

function byLabel(matches: NexusMatch[], label: string): NexusMatch {
  const match = matches.find((candidate) => candidate.label === label);
  if (!match) throw new Error(`no ${label} in the fixture`);
  return match;
}

describe("Schedule Sync from Nexus", () => {
  it("adds every practice, qualification, playoff, and final match with 1690 as a Synced Match", () => {
    expect(sync(isde1).add.map((packet) => packet[0])).toEqual([
      "Practice 3", "Practice 9",
      "Quals 2", "Quals 9", "Quals 13", "Quals 16", "Quals 19", "Quals 27", "Quals 32", "Quals 36", "Quals 41", "Quals 45", "Quals 50", "Quals 53",
      "Playoff 1", "Playoff 7", "Playoff 11",
      "Final 1", "Final 2", "Final 3",
    ]);
  });

  it("puts each team in the Station the schedule assigns", () => {
    const stations = new Map(sync(isde1).add.map((packet) => [packet[0], packet.slice(1, 7)]));

    expect(stations.get("Practice 3")).toEqual(["1577", "3211", "1690", "2679", "3835", "7067"]);
    expect(stations.get("Quals 16")).toEqual(["8223", "3065", "9739", "4586", "11480", "1690"]);
    expect(stations.get("Final 2")).toEqual(["1690", "2231", "11480", "4590", "1577", "2679"]);
  });

  it("gives Synced Matches the TBA keys STATS needs, with no match key for practice", () => {
    const keys = new Map(sync(isde1).add.map((packet) => [packet[0], packet.slice(9, 12)]));

    expect(keys.get("Practice 9")).toEqual(["2026isde1", null, 2026]);
    expect(keys.get("Quals 13")).toEqual(["2026isde1", "2026isde1_qm13", 2026]);
    expect(keys.get("Playoff 11")).toEqual(["2026isde1", "2026isde1_sf11m1", 2026]);
    expect(keys.get("Final 2")).toEqual(["2026isde1", "2026isde1_f1m2", 2026]);
  });

  it("adds nothing on a second sync and leaves the Synced Matches already on the board alone", () => {
    const first = sync(isde1).add;
    const edited = structuredClone(first);
    edited[0][1] = "254";

    expect(sync(isde1, edited)).toEqual({ add: [], update: [] });
  });

  it("follows the championship schedule, including practice matches played out of label order", () => {
    expect(sync(iscmp).add.map((packet) => packet[0])).toEqual([
      "Practice 3", "Practice 15", "Practice 9",
      "Quals 2", "Quals 11", "Quals 18", "Quals 22", "Quals 26", "Quals 35", "Quals 42", "Quals 46", "Quals 53", "Quals 59",
      "Playoff 1", "Playoff 7", "Playoff 11",
      "Final 1", "Final 2", "Final 3",
    ]);
  });

  it("fills an alliance listed with four teams from its first three", () => {
    const fourTeams = edited(isde1, (matches) => { byLabel(matches, "Playoff 7").redTeams = ["1690", "2231", "11480", "9740"]; });

    const playoff7 = sync(fourTeams).add.find((packet) => packet[0] === "Playoff 7")!;

    expect(playoff7.slice(1, 4)).toEqual(["1690", "2231", "11480"]);
    expect(readExtras(playoff7).sync?.red).toEqual(["1690", "2231", "11480", "9740"]);
  });

  it("waits for both alliances before adding a match, and ignores labels it can't read", () => {
    const pending = edited(isde1, (matches) => {
      matches.push({ label: "Playoff 14", status: "Queuing soon", redTeams: ["1690", "2231", "11480"], blueTeams: null, times: {} });
      matches.push({ label: "Einstein 1", status: "Queuing soon", redTeams: ["1690", "2231", "11480"], blueTeams: ["254", "1678", "4414"], times: {} });
    });

    const names = sync(pending).add.map((packet) => packet[0]);

    expect(names).not.toContain("Playoff 14");
    expect(names).toHaveLength(20);
  });

  it("produces packets the existing codec reads and the browser runtime keeps intact", () => {
    for (const packet of sync(isde1).add) {
      const board = whiteboardMatchFromPacket(packet);

      expect([board.redOne, board.redTwo, board.redThree, board.blueOne, board.blueTwo, board.blueThree]).toEqual(packet.slice(1, 7));
      expect(normalizeBrowserMatchPacket(structuredClone(packet))).toEqual(packet);
    }
  });

  it("turns a copy of a Synced Match into a What-if Match that keeps its TBA keys and that sync never claims", () => {
    const synced = sync(isde1).add.find((packet) => packet[0] === "Quals 13")!;

    const source = structuredClone(synced);
    source[7] = "copy-id";
    const copy = toWhatIfMatch(source);

    expect(readExtras(copy).sync).toBeUndefined();
    expect(copy.slice(9, 12)).toEqual(["2026isde1", "2026isde1_qm13", 2026]);
    expect(sync(isde1, [copy]).add.map((packet) => packet[0])).toContain("Quals 13");
  });

  it("marks each Synced Match with its schedule identity and the team lists seen", () => {
    const quals2 = sync(isde1).add.find((packet) => packet[0] === "Quals 2")!;

    expect(readExtras(quals2).sync).toEqual({
      eventKey: "2026isde1", level: "qual", number: 2,
      red: ["9740", "9738", "1574"], blue: ["1690", "7039", "2231"],
    });
  });
});
