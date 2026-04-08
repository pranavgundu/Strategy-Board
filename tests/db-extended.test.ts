import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(),
  getMany: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  entries: vi.fn(),
  del: vi.fn(),
}));

import { get, set, del, clear, entries, getMany } from "idb-keyval";
import { GET, SET, DEL, CLEAR, ENTRIES, GETMANY, GET_CACHED_STATBOTICS, CACHE_STATBOTICS, CLEAR_STATBOTICS_CACHE } from "../src/db.ts";

describe("db error handling without handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns undefined and logs on error without handler", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(get).mockRejectedValueOnce(new Error("fail"));

    const result = await GET("key");
    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("GETMANY returns undefined and logs on error without handler", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getMany).mockRejectedValueOnce(new Error("fail"));

    const result = await GETMANY(["a", "b"]);
    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SET logs on error without handler", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(set).mockRejectedValueOnce(new Error("fail"));

    await SET("key", "value");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SET calls handler on error", async () => {
    const handler = vi.fn();
    vi.mocked(set).mockRejectedValueOnce(new Error("fail"));

    await SET("key", "value", handler);
    expect(handler).toHaveBeenCalled();
  });

  it("DEL logs on error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(del).mockRejectedValueOnce(new Error("fail"));

    await DEL("key");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("CLEAR logs on error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(clear).mockRejectedValueOnce(new Error("fail"));

    await CLEAR();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("ENTRIES returns undefined with handler on error", async () => {
    const handler = vi.fn();
    vi.mocked(entries).mockRejectedValueOnce(new Error("fail"));

    const result = await ENTRIES(handler);
    expect(result).toBeUndefined();
    expect(handler).toHaveBeenCalled();
  });

  it("ENTRIES logs on error without handler", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(entries).mockRejectedValueOnce(new Error("fail"));

    const result = await ENTRIES();
    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("Statbotics cache edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined when no cached data exists", async () => {
    vi.mocked(get).mockResolvedValueOnce(undefined);
    const result = await GET_CACHED_STATBOTICS("nonexistent");
    expect(result).toBeUndefined();
  });

  it("uses default 24h TTL", async () => {
    vi.spyOn(Date, "now").mockReturnValue(100_000_000);

    // Within 24h
    vi.mocked(get).mockResolvedValueOnce({
      data: { ok: true },
      timestamp: 100_000_000 - 1000,
      matchKey: "m1",
    });

    const result = await GET_CACHED_STATBOTICS("m1");
    expect(result).toEqual({ ok: true });
  });

  it("CLEAR_STATBOTICS_CACHE handles errors gracefully", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(entries).mockRejectedValueOnce(new Error("db error"));

    await CLEAR_STATBOTICS_CACHE();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("CACHE_STATBOTICS logs error via handler", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(set).mockRejectedValueOnce(new Error("write failed"));

    await CACHE_STATBOTICS("key", { x: 1 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
