import { describe, expect, it } from "vitest";

import { addChecklistRow, checklistProgress, deleteChecklistRow, emptyBoardConfig, moveChecklistRow, newMatchPacket, readBoardConfig, readExtras, readTicks, renameChecklistRow, toggleTick, type BoardConfig } from "$lib/domain";
import { normalizeBrowserMatchPacket } from "$lib/native/web";
import { whiteboardMatchFromPacket, writeWhiteboardPacket } from "$lib/whiteboard/packet";

function meetingChecklist(): BoardConfig {
  let config = emptyBoardConfig();
  for (const row of [
    { id: "auto", kind: "heading", text: "Auto" },
    { id: "start", kind: "item", text: "Starting positions" },
    { id: "paths", kind: "item", text: "Auto paths" },
    { id: "teleop", kind: "heading", text: "Teleop" },
    { id: "defense", kind: "item", text: "Who plays defense" },
  ] as const) config = addChecklistRow(config, row);
  return config;
}

describe("Checklist editing", () => {
  it("adds Items and Headings in order, each with its own id", () => {
    let config = addChecklistRow(emptyBoardConfig(), { id: "auto", kind: "heading", text: "Auto" });
    config = addChecklistRow(config, { id: "start", kind: "item", text: "Starting positions" });
    config = addChecklistRow(config, { id: "paths", kind: "item", text: "Auto paths" });

    expect(config.checklist).toEqual([
      { id: "auto", kind: "heading", text: "Auto" },
      { id: "start", kind: "item", text: "Starting positions" },
      { id: "paths", kind: "item", text: "Auto paths" },
    ]);
  });

  it("renames a row without changing its id", () => {
    const config = renameChecklistRow(meetingChecklist(), "paths", "Auto paths and pickups");

    expect(config.checklist[2]).toEqual({ id: "paths", kind: "item", text: "Auto paths and pickups" });
  });

  it("moves a row to a new position and keeps every row's id", () => {
    const moved = moveChecklistRow(meetingChecklist(), "defense", 1);

    expect(moved.checklist.map((row) => row.id)).toEqual(["auto", "defense", "start", "paths", "teleop"]);
    expect(moveChecklistRow(moved, "auto", 99).checklist.map((row) => row.id)).toEqual(["defense", "start", "paths", "teleop", "auto"]);
  });

  it("deletes only the chosen row", () => {
    const config = deleteChecklistRow(meetingChecklist(), "start");

    expect(config.checklist.map((row) => row.id)).toEqual(["auto", "paths", "teleop", "defense"]);
  });

  it("reads a stored Checklist back with its ids, skipping rows that are damaged or repeated", () => {
    const stored = JSON.parse(JSON.stringify(meetingChecklist()));
    stored.checklist.push({ id: "auto", kind: "item", text: "Duplicate id" }, { id: "x", kind: "note", text: "Unknown kind" }, { kind: "item", text: "No id" });

    expect(readBoardConfig(stored).checklist).toEqual(meetingChecklist().checklist);
  });
});

describe("Ticks", () => {
  const match = () => newMatchPacket({ matchName: "Quals 12", redTeams: ["1690", "2231", "11480"], blueTeams: ["4590", "1577", "2679"], tbaYear: 2026 }, "quals-12");

  it("tick and untick an Item in one Match, while Headings can't be ticked", () => {
    const { checklist } = meetingChecklist();

    const ticked = toggleTick(toggleTick(match(), checklist, "paths"), checklist, "defense");

    expect(readTicks(ticked, checklist)).toEqual(["paths", "defense"]);
    expect(readTicks(toggleTick(ticked, checklist, "paths"), checklist)).toEqual(["defense"]);
    expect(readTicks(toggleTick(ticked, checklist, "auto"), checklist)).toEqual(["paths", "defense"]);
    expect(readTicks(match(), checklist)).toEqual([]);
  });

  it("stay with their Items through renames and reorders", () => {
    const ticked = toggleTick(match(), meetingChecklist().checklist, "start");

    const edited = moveChecklistRow(renameChecklistRow(meetingChecklist(), "start", "Who starts where"), "start", 4);

    expect(readTicks(ticked, edited.checklist)).toEqual(["start"]);
  });

  it("of a deleted Item are ignored, then pruned the next time the Match's Ticks are written", () => {
    const ticked = toggleTick(toggleTick(match(), meetingChecklist().checklist, "start"), meetingChecklist().checklist, "paths");
    const { checklist } = deleteChecklistRow(meetingChecklist(), "start");

    expect(readTicks(ticked, checklist)).toEqual(["paths"]);
    expect(readExtras(toggleTick(ticked, checklist, "defense")).ticks).toEqual(["paths", "defense"]);
  });

  it("show progress as ticked Items over all Items", () => {
    const { checklist } = meetingChecklist();

    expect(checklistProgress(checklist, ["paths", "defense"])).toEqual({ ticked: 2, total: 3 });
  });

  it("survive the existing packet codec and the browser runtime's normalization", () => {
    const { checklist } = meetingChecklist();
    const ticked = toggleTick(match(), checklist, "paths");

    const redrawn = writeWhiteboardPacket(ticked, whiteboardMatchFromPacket(ticked));

    expect(readTicks(redrawn, checklist)).toEqual(["paths"]);
    expect(readTicks(normalizeBrowserMatchPacket(structuredClone(redrawn)), checklist)).toEqual(["paths"]);
  });
});
