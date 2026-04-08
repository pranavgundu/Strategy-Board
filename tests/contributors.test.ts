import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContributorsService } from "../src/contributors.ts";

describe("ContributorsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and caches teams from contributors.txt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "1114\n2056\n\n  254  ",
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new ContributorsService();

    await expect(service.fetchTeams()).resolves.toEqual(["1114", "2056", "254"]);
    await expect(service.fetchTeams()).resolves.toEqual(["1114", "2056", "254"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty teams on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const service = new ContributorsService();

    await expect(service.fetchTeams()).resolves.toEqual([]);
  });

  it("fetches contributors, filters dependabot, and enriches user details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            login: "alice",
            avatar_url: "a",
            html_url: "ha",
            contributions: 10,
          },
          {
            login: "dependabot[bot]",
            avatar_url: "b",
            html_url: "hb",
            contributions: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: "Alice", bio: "Builder" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const service = new ContributorsService();
    const contributors = await service.fetchContributors();

    expect(contributors).toHaveLength(1);
    expect(contributors[0]).toMatchObject({
      login: "alice",
      name: "Alice",
      bio: "Builder",
    });
    expect(service.getRecentContributors(1)).toHaveLength(1);
    expect(service.hasLoadError()).toBe(false);

    await service.fetchContributors();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks load error on contributors API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const service = new ContributorsService();
    await expect(service.fetchContributors()).rejects.toThrow("GitHub API error: 500");
    expect(service.hasLoadError()).toBe(true);
    expect(service.isLoadingContributors()).toBe(false);
  });

  it("returns build commit information", async () => {
    const service = new ContributorsService();
    const commit = await service.fetchLastCommit();

    expect(commit).not.toBeNull();
    expect(commit?.sha).toBeTypeOf("string");
    expect(commit?.url).toContain("github.com");

    const cached = await service.fetchLastCommit();
    expect(cached).toBe(commit);
  });
});
