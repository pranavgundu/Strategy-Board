import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db.ts", () => ({
  GET: vi.fn(),
  GETMANY: vi.fn(),
  SET: vi.fn(),
  CLEAR: vi.fn(),
}));

import { CLEAR, GET, GETMANY, SET } from "../src/db.ts";
import { Match } from "../src/match.ts";
import { Model } from "../src/model.ts";

describe("Model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.dataLayer = [];
  });

  it("loads matches from consolidated appData format", async () => {
    const packet = new Match("Q1", "1", "2", "3", "4", "5", "6", "id-1").getAsPacket();

    vi.mocked(GET).mockImplementation(async (key: string) => {
      if (key === "appData") return [packet] as any;
      return undefined as any;
    });

    const model = new Model();
    await model.loadPersistentData();

    expect(model.matches).toHaveLength(1);
    expect(model.matches[0].id).toBe("id-1");
  });

  it("migrates legacy format to consolidated appData", async () => {
    const packet = new Match("Q2", "1", "2", "3", "4", "5", "6", "id-2").getAsPacket();

    vi.mocked(GET).mockImplementation(async (key: string) => {
      if (key === "appData") return undefined as any;
      if (key === "matchIds") return ["id-2"] as any;
      return undefined as any;
    });
    vi.mocked(GETMANY).mockResolvedValue([packet] as any);

    const model = new Model();
    await model.loadPersistentData();

    expect(model.matches).toHaveLength(1);
    expect(SET).toHaveBeenCalledWith("appData", expect.any(Array), expect.any(Function));
    const savedPackets = vi.mocked(SET).mock.calls[0][1] as any[][];
    expect(savedPackets).toHaveLength(1);
    expect(savedPackets[0][0]).toBe("Q2");
    expect(savedPackets[0][7]).toBe("id-2");
  });

  it("creates, updates, deletes, and clears matches", async () => {
    const model = new Model();

    const id = await model.createNewMatch("Q3", "1", "2", "3", "4", "5", "6");
    expect(model.getMatch(id)).not.toBeNull();
    expect(window.dataLayer).toContainEqual({ event: "match_creation" });

    await model.updateMatch(id);
    expect(SET).toHaveBeenCalled();

    await model.deleteMatch(id);
    expect(model.getMatch(id)).toBeNull();

    await model.clear();
    expect(model.matches).toHaveLength(0);
    expect(CLEAR).toHaveBeenCalledTimes(1);
  });
});
