import { indexedDB } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import { BoardFileError, encodeMatchFile, readBoardFile } from "$lib/domain";
import { browserInvoke, createBrowserMatchPacket } from "$lib/native/web";
import type { MatchPacket } from "$lib/native/types";
import { whiteboardMatchFromPacket } from "$lib/whiteboard/packet";

function plannedMatch(): MatchPacket {
  const packet = createBrowserMatchPacket({
    matchName: "Quals 12", redTeams: ["1690", "2231", "11480"], blueTeams: ["4590", "1577", "2679"],
    tbaEventKey: "2026isde1", tbaMatchKey: "2026isde1_qm12", tbaYear: 2026,
  }, "local-id");
  const body = packet[8] as unknown[][];
  body[1][0] = [2400, 1300, 1.57];
  body[1][6] = [[0, [2400, 1300], [2100, 1100], [1900, 900]]];
  body[1][7] = [[1900, 900, 2400, 1300]];
  body[4][6] = [[3, [100, 100], [200, 200]]];
  body[4][8] = [[300, 300, 0, true]];
  body[5][6] = [[1, [500, 500]]];
  packet[12] = { selectedFieldYear: 2026, futureMetadata: "kept" };
  return packet;
}

describe("Match Files", () => {
  it("round-trip a Match without losing board data", () => {
    const source = plannedMatch();

    const file = readBoardFile(encodeMatchFile(source));

    expect(file.kind).toBe("match");
    if (file.kind !== "match") return;
    expect(file.packet.slice(0, 7)).toEqual(source.slice(0, 7));
    expect(file.packet.slice(8)).toEqual(source.slice(8));
    expect({ ...whiteboardMatchFromPacket(file.packet), id: "" }).toEqual({ ...whiteboardMatchFromPacket(source), id: "" });
  });

  it("import as a What-if Match that never replaces an existing Match", () => {
    const source = plannedMatch();
    source[12] = {
      selectedFieldYear: 2026,
      orbit: { sync: { eventKey: "2026isde1", level: "qual", number: 12, red: ["1690", "2231", "11480"], blue: ["4590", "1577", "2679"] }, ticks: ["item-1"] },
    };

    const file = readBoardFile(encodeMatchFile(source));

    expect(file.packet[7]).toBeNull();
    expect(file.packet[12]).toEqual({ selectedFieldYear: 2026, orbit: { ticks: ["item-1"] } });
    expect(file.packet.slice(9, 11)).toEqual(["2026isde1", "2026isde1_qm12"]);
  });

  it("add a new Match every time the same file is imported", async () => {
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: indexedDB });
    await browserInvoke("model_clear_matches");
    const text = encodeMatchFile(plannedMatch());

    await browserInvoke("model_add_packets", { packets: [readBoardFile(text).packet] });
    await browserInvoke("model_add_packets", { packets: [readBoardFile(text).packet] });

    const stored = await browserInvoke<MatchPacket[]>("model_load_packets");
    expect(stored.map((packet) => packet[0])).toEqual(["Quals 12", "Quals 12"]);
    expect(new Set(stored.map((packet) => packet[7])).size).toBe(2);
  });

  it("reject a broken file, a file of another kind, or a version this board can't read", () => {
    const valid = JSON.parse(encodeMatchFile(plannedMatch()));

    for (const text of [
      "not json",
      JSON.stringify({ hello: "world" }),
      JSON.stringify({ ...valid, type: "someone-else/match" }),
      JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, packet: ["Quals 12", "1690"] }),
    ]) {
      expect(() => readBoardFile(text)).toThrow(BoardFileError);
    }
  });
});
