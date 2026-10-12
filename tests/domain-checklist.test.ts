import { describe, expect, it } from "vitest";

import { addChecklistRow, deleteChecklistRow, emptyBoardConfig, moveChecklistRow, readBoardConfig, renameChecklistRow, type BoardConfig } from "$lib/domain";

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
