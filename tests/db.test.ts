import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(),
  getMany: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  entries: vi.fn(),
  del: vi.fn(),
}));

import { clear, del, entries, get, getMany, set } from "idb-keyval";
import {
  CACHE_STATBOTICS,
  CLEAR,
  CLEAR_STATBOTICS_CACHE,
  DEL,
  ENTRIES,
  GET,
  GETMANY,
  GET_CACHED_STATBOTICS,
  SET,
} from "../src/db.ts";

describe("db wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET/GETMANY return values on success", async () => {
    vi.mocked(get).mockResolvedValueOnce("value");
    vi.mocked(getMany).mockResolvedValueOnce(["a", "b"]);

    await expect(GET("k")).resolves.toBe("value");
    await expect(GETMANY(["k1", "k2"])).resolves.toEqual(["a", "b"]);
  });

  it("calls handlers on failures", async () => {
    const err = new Error("boom");
    const h1 = vi.fn();
    const h2 = vi.fn();

    vi.mocked(get).mockRejectedValueOnce(err);
    vi.mocked(getMany).mockRejectedValueOnce(err);

    await expect(GET("k", h1)).resolves.toBeUndefined();
    await expect(GETMANY(["k"], h2)).resolves.toBeUndefined();

    expect(h1).toHaveBeenCalledWith(err);
    expect(h2).toHaveBeenCalledWith(err);
  });

  it("SET/DEL/CLEAR call underlying idb methods", async () => {
    await SET("k", { x: 1 });
    await DEL("k");
    await CLEAR();

    expect(set).toHaveBeenCalledWith("k", { x: 1 });
    expect(del).toHaveBeenCalledWith("k");
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("ENTRIES returns key-value pairs", async () => {
    vi.mocked(entries).mockResolvedValueOnce([["a", 1] as any]);
    await expect(ENTRIES()).resolves.toEqual([["a", 1]]);
  });
});

describe("Statbotics cache helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores cache entries with statbotics_ prefix", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    await CACHE_STATBOTICS("2026miket_qm1", { score: 99 });

    expect(set).toHaveBeenCalledWith(
      "statbotics_2026miket_qm1",
      expect.objectContaining({
        data: { score: 99 },
        timestamp: 1000,
        matchKey: "2026miket_qm1",
      }),
    );
  });

  it("returns cached data when fresh and deletes when expired", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);

    vi.mocked(get).mockResolvedValueOnce({
      data: { ok: true },
      timestamp: 9_500,
      matchKey: "m1",
    });

    await expect(GET_CACHED_STATBOTICS("m1", 1000)).resolves.toEqual({ ok: true });
    expect(del).not.toHaveBeenCalled();

    vi.mocked(get).mockResolvedValueOnce({
      data: { ok: true },
      timestamp: 0,
      matchKey: "m2",
    });

    await expect(GET_CACHED_STATBOTICS("m2", 1000)).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith("statbotics_m2");
  });

  it("clears only statbotics cache keys", async () => {
    vi.mocked(entries).mockResolvedValueOnce([
      ["statbotics_a", {}],
      ["appData", {}],
      ["statbotics_b", {}],
    ] as any);

    await CLEAR_STATBOTICS_CACHE();

    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith("statbotics_a");
    expect(del).toHaveBeenCalledWith("statbotics_b");
  });
});
