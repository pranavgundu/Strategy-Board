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

describe("Model loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.dataLayer = [];
  });

  it("skips corrupt packets without crashing", async () => {
    const good = new Match("Q1", "1", "2", "3", "4", "5", "6", "good").getAsPacket();
    const corrupt = "not a packet";

    vi.mocked(GET).mockImplementation(async (key: string) => {
      if (key === "appData") return [good, corrupt, good] as any;
      return undefined as any;
    });

    const model = new Model();
    await model.loadPersistentData();

    expect(model.matches).toHaveLength(2);
    expect(model.matches[0].id).toBe("good");
  });

  it("does nothing when both appData and matchIds are undefined", async () => {
    vi.mocked(GET).mockResolvedValue(undefined as any);

    const model = new Model();
    await model.loadPersistentData();

    expect(model.matches).toHaveLength(0);
    expect(SET).not.toHaveBeenCalled();
  });

  it("legacy migration re-serializes from successfully parsed matches", async () => {
    const packet = new Match("Q1", "1", "2", "3", "4", "5", "6", "id-m").getAsPacket();

    vi.mocked(GET).mockImplementation(async (key: string) => {
      if (key === "appData") return undefined as any;
      if (key === "matchIds") return ["id-m"] as any;
      return undefined as any;
    });
    vi.mocked(GETMANY).mockResolvedValue([packet] as any);

    const model = new Model();
    await model.loadPersistentData();

    expect(model.matches).toHaveLength(1);
    expect(SET).toHaveBeenCalled();
    const savedArg = vi.mocked(SET).mock.calls[0][1] as any[][];
    expect(savedArg[0][7]).toBe("id-m");
  });
});

describe("Model CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.dataLayer = [];
  });

  it("delete is a no-op for nonexistent id", async () => {
    const model = new Model();
    await model.createNewMatch("Q1", "1", "2", "3", "4", "5", "6");

    vi.mocked(SET).mockClear();
    await model.deleteMatch("nonexistent");

    expect(model.matches).toHaveLength(1);
    expect(SET).not.toHaveBeenCalled();
  });

  it("getMatch returns null for nonexistent id", () => {
    const model = new Model();
    expect(model.getMatch("nope")).toBeNull();
  });

  it("update is a no-op for nonexistent id", async () => {
    const model = new Model();
    vi.mocked(SET).mockClear();

    await model.updateMatch("nonexistent");
    expect(SET).not.toHaveBeenCalled();
  });

  it("creates match with TBA metadata", async () => {
    const model = new Model();
    const id = await model.createNewMatch("Q1", "1", "2", "3", "4", "5", "6", "2026miket", "2026miket_qm1", 2026);

    const match = model.getMatch(id);
    expect(match).not.toBeNull();
    expect(match!.tbaEventKey).toBe("2026miket");
    expect(match!.tbaMatchKey).toBe("2026miket_qm1");
    expect(match!.tbaYear).toBe(2026);
  });

  it("persists all matches when one is deleted", async () => {
    const model = new Model();
    const id1 = await model.createNewMatch("Q1", "1", "2", "3", "4", "5", "6");
    const id2 = await model.createNewMatch("Q2", "7", "8", "9", "10", "11", "12");

    vi.mocked(SET).mockClear();
    await model.deleteMatch(id1);

    expect(model.matches).toHaveLength(1);
    expect(model.matches[0].id).toBe(id2);
    expect(SET).toHaveBeenCalledTimes(1);
  });

  it("clear resets everything", async () => {
    const model = new Model();
    await model.createNewMatch("Q1", "1", "2", "3", "4", "5", "6");
    await model.createNewMatch("Q2", "1", "2", "3", "4", "5", "6");

    await model.clear();

    expect(model.matches).toHaveLength(0);
    expect(CLEAR).toHaveBeenCalled();
  });
});
