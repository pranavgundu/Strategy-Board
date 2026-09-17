import { indexedDB } from "fake-indexeddb";
import { beforeAll, describe, expect, it } from "vitest";

import { browserInvoke, createBrowserMatchPacket, normalizeBrowserMatchPacket } from "../src/lib/native/web";

beforeAll(() => {
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: indexedDB });
});

describe("browser native fallback", () => {
  it("creates string-valued, native-compatible match packets", () => {
    const packet = createBrowserMatchPacket({
      matchName: "Qualification 1",
      redTeams: ["254", "1678", "4414"],
      blueTeams: ["2056", "1114", "1323"],
      tbaYear: 2026,
    }, "test-id");

    expect(packet.slice(0, 8)).toEqual([
      "Qualification 1", "254", "1678", "4414", "2056", "1114", "1323", "test-id",
    ]);
    expect(packet[8]).toHaveLength(6);
    expect(packet[8][1]).toHaveLength(9);
  });

  it("persists web preferences and match data without a Tauri bridge", async () => {
    await browserInvoke("storage_set", { key: "testTeamNumber", value: "834" });
    expect(await browserInvoke("storage_get", { key: "testTeamNumber" })).toBe("834");

    await browserInvoke("model_clear_matches");
    const packet = createBrowserMatchPacket({ matchName: "Web match", redTeams: ["1", "2", "3"], blueTeams: ["4", "5", "6"] }, "web-id");
    expect(await browserInvoke("model_add_packet", { packet })).toBe("web-id");
    expect(await browserInvoke<unknown[]>("model_load_packets")).toHaveLength(1);
  });

  it("repairs portable shared packets without losing board data or dimensions", () => {
    const source = createBrowserMatchPacket({
      matchName: "Shared match",
      redTeams: ["1", "2", "3"],
      blueTeams: ["4", "5", "6"],
    }, "source-id");
    source[7] = null as unknown as string;
    source[8][0] = [[100, 120], [101, 121], [102, 122], [103, 123], [104, 124], [105, 125]];
    (source[8][1] as unknown[])[6] = [[2, [10, 20], [30, 40]]];

    const normalized = normalizeBrowserMatchPacket(source);

    expect(normalized[7]).toMatch(/\S+/);
    expect(normalized[8][0]).toEqual(source[8][0]);
    expect((normalized[8][1] as unknown[])[6]).toEqual([[2, [10, 20], [30, 40]]]);
  });
});
