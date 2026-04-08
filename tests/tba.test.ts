import { beforeEach, describe, expect, it, vi } from "vitest";
import { TBAService, type TBAMatch, type TBASimpleEvent } from "../src/tba.ts";

describe("TBAService parsing", () => {
  const service = new TBAService();

  it("parses and formats events for display", () => {
    const events = service.parseEventsToSimple([
      {
        key: "2026miket",
        name: "Michigan Event",
        event_code: "miket",
        event_type: 0,
        start_date: "2026-03-14",
        end_date: "2026-03-16",
        year: 2026,
        city: "Detroit",
        state_prov: "MI",
        country: "USA",
      },
      {
        key: "2026cada",
        name: "Canada Event",
        event_code: "cada",
        event_type: 0,
        start_date: "2026-04-01",
        end_date: "2026-04-03",
        year: 2026,
        city: "Toronto",
        country: "Canada",
      },
    ]);

    expect(events[0].location).toBe("Detroit, MI");
    expect(events[0].dateRange).toBe("Mar 14-16");
    expect(events[1].location).toBe("Toronto, Canada");
  });

  it("sorts matches by level then set/match number", () => {
    const matches: TBAMatch[] = [
      {
        key: "k3",
        comp_level: "qf",
        set_number: 1,
        match_number: 2,
        alliances: { red: { team_keys: ["frc1"] }, blue: { team_keys: ["frc2"] } },
      },
      {
        key: "k1",
        comp_level: "qm",
        set_number: 1,
        match_number: 1,
        alliances: { red: { team_keys: ["frc3"] }, blue: { team_keys: ["frc4"] } },
      },
      {
        key: "k2",
        comp_level: "qm",
        set_number: 1,
        match_number: 2,
        alliances: { red: { team_keys: ["frc5"] }, blue: { team_keys: ["frc6"] } },
      },
    ];

    const simple = service.parseMatchesToSimple(matches);
    expect(simple.map((m) => m.matchName)).toEqual(["Quals 1", "Quals 2", "Quarters 1-2"]);
    expect(simple[0].redTeams).toEqual(["3"]);
  });

  it("filters events before 2025 and sorts newest-first", () => {
    const events: TBASimpleEvent[] = [
      { key: "old", name: "Old", location: "", dateRange: "Dec 1-2", year: 2024 },
      { key: "mid", name: "Mid", location: "", dateRange: "Jan 10-12", year: 2026 },
      { key: "new", name: "New", location: "", dateRange: "Mar 1-2", year: 2026 },
      { key: "bad", name: "Bad", location: "", dateRange: "???", year: 2026 },
    ];

    const result = service.filterAndSortEvents(events);
    expect(result.map((e) => e.key)).toEqual(["new", "mid"]);
  });
});

describe("TBAService requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchTeamsAtEvent strips frc prefix", async () => {
    const service = new TBAService();
    vi.spyOn(service, "getTeamsAtEvent").mockResolvedValue(["frc111", "frc222"]);

    await expect(service.fetchTeamsAtEvent("2026miket")).resolves.toEqual(["111", "222"]);
  });

  it("prefixes team key and performs authenticated request", async () => {
    const service = new TBAService();
    service.setApiKey("abc");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await service.getTeamMatchesAtEvent("254", "2026miket");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.thebluealliance.com/api/v3/team/frc254/event/2026miket/matches",
      expect.objectContaining({
        headers: { "X-TBA-Auth-Key": "abc" },
      }),
    );
  });

  it("falls back to team extraction from matches when teams endpoint fails", async () => {
    const service = new TBAService();
    service.setApiKey("abc");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            alliances: {
              red: { team_keys: ["frc1", "frc2"] },
              blue: { team_keys: ["frc3", "frc2"] },
            },
          },
        ],
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(service.getTeamsAtEvent("2026miket")).resolves.toEqual(["frc1", "frc2", "frc3"]);
  });
});
