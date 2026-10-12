import { describe, expect, it } from "vitest";

import { parseNexusEvent, parseTbaMatches, planSync, planTbaImport, readExtras, type EventSchedule } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";

import isde1Nexus from "./fixtures/nexus-2026isde1.json";
import isde1Tba from "./fixtures/tba-1690-2026isde1-matches.json";

let ids = 0;
const newId = () => `synced-${++ids}`;
const fromNexus = () => parseNexusEvent(isde1Nexus)!;
const fromTba = (matches: unknown = isde1Tba) => parseTbaMatches(matches, "2026isde1")!;
const sync = (schedule: EventSchedule, packets: readonly MatchPacket[] = []) => planSync({ packets, schedule, newId });
const names = (packets: readonly MatchPacket[]) => packets.map((packet) => packet[0]);

describe("Schedule Sync from TBA", () => {
  it("gives Synced Matches the same names and keys as Nexus does, without practice matches", () => {
    const board = sync(fromTba()).add;

    expect(names(board)).toEqual([
      "Quals 2", "Quals 9", "Quals 13", "Quals 16", "Quals 19", "Quals 27", "Quals 32", "Quals 36", "Quals 41", "Quals 45", "Quals 50", "Quals 53",
      "Playoff 1", "Playoff 7", "Playoff 11", "Final 1", "Final 2",
    ]);
    expect(board.map((packet) => packet[10])).toEqual(sync(fromNexus()).add.filter((packet) => !packet[0].startsWith("Practice") && packet[0] !== "Final 3").map((packet) => packet[10]));
  });

  it("switches from Nexus without duplicates, moving plans with their teams when TBA reports the real playoff stations", () => {
    const board = sync(fromNexus()).add;

    const plan = sync(fromTba(), board);

    expect(plan.add).toEqual([]);
    expect(names(plan.update)).toEqual(["Playoff 1", "Playoff 7", "Playoff 11", "Final 1", "Final 2"]);
    expect(plan.update[0].slice(1, 7)).toEqual(["11480", "2231", "1690", "3211", "7067", "1580"]);
    expect(readExtras(plan.update[0]).sync).toMatchObject({ red: ["11480", "2231", "1690"], blue: ["3211", "7067", "1580"] });
  });

  it("switches back to Nexus adding only what TBA doesn't list", () => {
    const board = sync(fromTba()).add;

    expect(names(sync(fromNexus(), board).add)).toEqual(["Practice 3", "Practice 9", "Final 3"]);
  });

  it("counts a match as played once TBA has its result, and maps a replayed playoff key onto the original", () => {
    const pending = structuredClone(isde1Tba);
    const final2 = pending.find((match) => match.key === "2026isde1_f1m2")!;
    final2.alliances.red.score = -1;
    final2.alliances.blue.score = -1;
    pending.push({ ...structuredClone(pending.find((match) => match.key === "2026isde1_sf7m1")!), key: "2026isde1_sf7m2", match_number: 2 });

    const plan = sync(fromTba(pending));

    expect(plan.schedule["2026isde1:final:1"].played).toBe(true);
    expect(plan.schedule["2026isde1:final:2"].played).toBe(false);
    expect(plan.nextMatch).toBe("2026isde1:final:2");
    expect(names(plan.add).filter((name) => name === "Playoff 7")).toHaveLength(1);
    expect(plan.schedule["2026isde1:playoff:7"].status).toBeNull();
  });

  it("never shifts teams when TBA lists fewer than three", () => {
    const board = sync(fromNexus()).add;
    const shortened = structuredClone(isde1Tba);
    shortened.find((match) => match.key === "2026isde1_qm13")!.alliances.blue.team_keys = ["frc1574", "frc1690"];

    const quals13 = sync(fromTba(shortened), board).update.find((packet) => packet[0] === "Quals 13")!;

    expect(quals13.slice(4, 7)).toEqual(["1574", "", "1690"]);
  });
});

describe("The manual TBA import", () => {
  const importFor = (packets: readonly MatchPacket[], currentEventKey: string | null) =>
    planTbaImport({ packets, matches: isde1Tba, eventKey: "2026isde1", team: "1690", currentEventKey, newId });

  it("skips matches already on the board, whether synced or imported before", () => {
    const board = sync(fromNexus()).add.filter((packet) => packet[0] !== "Quals 13");

    const imported = importFor(board, null);

    expect(names(imported)).toEqual(["Quals 13"]);
    expect(importFor([...board, ...imported], null)).toEqual([]);
  });

  it("makes imports for the Current Event Synced Matches that sync then follows, and plain matches for other events", () => {
    const current = importFor([], "2026isde1");
    const elsewhere = importFor([], "2026iscmp");

    expect(current.every((packet) => readExtras(packet).sync?.eventKey === "2026isde1")).toBe(true);
    expect(elsewhere.every((packet) => readExtras(packet).sync === undefined && packet[10]?.startsWith("2026isde1_"))).toBe(true);
    expect(names(sync(fromNexus(), current).add)).toEqual(["Practice 3", "Practice 9", "Final 3"]);
  });
});
