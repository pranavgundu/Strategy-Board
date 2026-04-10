import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TBAService,
  type TBAEvent,
  type TBAMatch,
  type TBASimpleEvent,
} from "../src/tba.ts";

describe("TBAService parseEventsToSimple mass coverage", () => {
  const service = new TBAService();

  const locationCases = [
    ["Detroit", "MI", "USA", "Detroit, MI"],
    ["Toronto", undefined, "Canada", "Toronto, Canada"],
    [undefined, "ON", "Canada", "ON, Canada"],
    ["Lyon", undefined, "France", "Lyon, France"],
    ["Tokyo", undefined, "Japan", "Tokyo, Japan"],
    ["Mexico City", undefined, "Mexico", "Mexico City, Mexico"],
    ["Sydney", "NSW", "Australia", "Sydney, NSW, Australia"],
    ["Sao Paulo", "SP", "Brazil", "Sao Paulo, SP, Brazil"],
    ["Berlin", undefined, "Germany", "Berlin, Germany"],
    [undefined, undefined, undefined, ""],
  ] as const;

  it.each(locationCases)(
    "formats location from city=%s state=%s country=%s",
    (city, state, country, expectedLocation) => {
      const out = service.parseEventsToSimple([
        {
          key: "k",
          name: "Event",
          event_code: "e",
          event_type: 0,
          start_date: "2026-03-01",
          end_date: "2026-03-03",
          year: 2026,
          city,
          state_prov: state,
          country,
        },
      ] as TBAEvent[]);

      expect(out[0].location).toBe(expectedLocation);
      expect(out[0].dateRange).toBe("Mar 1-3");
    },
  );

  const dateCases = [
    ["2026-01-01", "2026-01-03", "Jan 1-3"],
    ["2026-02-10", "2026-02-10", "Feb 10-10"],
    ["2026-03-31", "2026-04-02", "Mar 31 - Apr 2"],
    ["2026-04-05", "2026-04-07", "Apr 5-7"],
    ["2026-05-20", "2026-05-22", "May 20-22"],
    ["2026-06-28", "2026-07-01", "Jun 28 - Jul 1"],
    ["2026-08-01", "2026-08-04", "Aug 1-4"],
    ["2026-09-15", "2026-09-18", "Sep 15-18"],
    ["2026-10-29", "2026-11-01", "Oct 29 - Nov 1"],
    ["2026-12-30", "2027-01-02", "Dec 30 - Jan 2"],
  ] as const;

  it.each(dateCases)("formats date range %s..%s", (start, end, expected) => {
    const out = service.parseEventsToSimple([
      {
        key: "k",
        name: "Event",
        event_code: "e",
        event_type: 0,
        start_date: start,
        end_date: end,
        year: 2026,
      },
    ] as TBAEvent[]);

    expect(out[0].dateRange).toBe(expected);
  });
});

describe("TBAService parseMatchesToSimple mass coverage", () => {
  const service = new TBAService();

  it("sorts mixed levels using level order and set/match tie-breakers", () => {
    const matches: TBAMatch[] = [
      {
        key: "f1m2",
        comp_level: "f",
        set_number: 1,
        match_number: 2,
        alliances: { red: { team_keys: ["frc1"] }, blue: { team_keys: ["frc2"] } },
      },
      {
        key: "qm2",
        comp_level: "qm",
        set_number: 1,
        match_number: 2,
        alliances: { red: { team_keys: ["frc3"] }, blue: { team_keys: ["frc4"] } },
      },
      {
        key: "sf1m1",
        comp_level: "sf",
        set_number: 1,
        match_number: 1,
        alliances: { red: { team_keys: ["frc5"] }, blue: { team_keys: ["frc6"] } },
      },
      {
        key: "qf1m1",
        comp_level: "qf",
        set_number: 1,
        match_number: 1,
        alliances: { red: { team_keys: ["frc7"] }, blue: { team_keys: ["frc8"] } },
      },
      {
        key: "ef2m1",
        comp_level: "ef",
        set_number: 2,
        match_number: 1,
        alliances: { red: { team_keys: ["frc9"] }, blue: { team_keys: ["frc10"] } },
      },
      {
        key: "qm1",
        comp_level: "qm",
        set_number: 1,
        match_number: 1,
        alliances: { red: { team_keys: ["frc11"] }, blue: { team_keys: ["frc12"] } },
      },
    ];

    const parsed = service.parseMatchesToSimple(matches);
    expect(parsed.map((m) => m.matchName)).toEqual([
      "Quals 1",
      "Quals 2",
      "Eighths 2-1",
      "Quarters 1-1",
      "Semis 1-1",
      "Finals 1-2",
    ]);
    expect(parsed[0].redTeams[0]).toBe("11");
    expect(parsed[0].blueTeams[0]).toBe("12");
  });

  const levelCases = [
    ["qm", 2, 9, "Quals 9"],
    ["ef", 3, 1, "Eighths 3-1"],
    ["qf", 2, 3, "Quarters 2-3"],
    ["sf", 1, 2, "Semis 1-2"],
    ["f", 1, 1, "Finals 1-1"],
    ["xx", 2, 4, "XX 2-4"],
    ["abc", 7, 8, "ABC 7-8"],
  ] as const;

  it.each(levelCases)(
    "formats match names for level=%s",
    (comp_level, set_number, match_number, expectedName) => {
      const parsed = service.parseMatchesToSimple([
        {
          key: "k",
          comp_level,
          set_number,
          match_number,
          alliances: {
            red: { team_keys: ["frc254", "frc1114", "frc2056"] },
            blue: { team_keys: ["frc1678", "frc971", "frc148"] },
          },
        },
      ]);

      expect(parsed[0].matchName).toBe(expectedName);
      expect(parsed[0].redTeams).toEqual(["254", "1114", "2056"]);
      expect(parsed[0].blueTeams).toEqual(["1678", "971", "148"]);
    },
  );
});

describe("TBAService filterAndSortEvents mass coverage", () => {
  const service = new TBAService();

  const filterCases = [
    ["Jan 1-2", 2025, true],
    ["Jan 2-3", 2025, true],
    ["Dec 31-31", 2024, false],
    ["Mar 10-12", 2026, true],
    ["Apr 5-7", 2027, true],
    ["???", 2026, false],
    ["March 1-2", 2026, false],
    ["Jan xx-2", 2026, false],
    ["", 2026, false],
    ["Jun 9-11", 2025, true],
  ] as const;

  it.each(filterCases)("keeps=%s for %s in %d", (dateRange, year, expected) => {
    const events: TBASimpleEvent[] = [
      { key: "x", name: "X", location: "", dateRange, year },
    ];

    const out = service.filterAndSortEvents(events);
    expect(out.length > 0).toBe(expected);
  });

  it("sorts valid filtered events newest first", () => {
    const events: TBASimpleEvent[] = [
      { key: "a", name: "A", location: "", dateRange: "Jan 1-2", year: 2026 },
      { key: "b", name: "B", location: "", dateRange: "Mar 1-2", year: 2026 },
      { key: "c", name: "C", location: "", dateRange: "Feb 1-2", year: 2026 },
      { key: "d", name: "D", location: "", dateRange: "???", year: 2026 },
    ];

    const out = service.filterAndSortEvents(events);
    expect(out.map((e) => e.key)).toEqual(["b", "c", "a"]);
  });
});

describe("TBAService request flow mass coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const endpointCases = [
    ["1234", "2026miket", "https://www.thebluealliance.com/api/v3/team/frc1234/event/2026miket/matches"],
    ["frc2056", "2026oncmp", "https://www.thebluealliance.com/api/v3/team/frc2056/event/2026oncmp/matches"],
    ["254", "2025cacc", "https://www.thebluealliance.com/api/v3/team/frc254/event/2025cacc/matches"],
    ["frc1114", "2025oncmp", "https://www.thebluealliance.com/api/v3/team/frc1114/event/2025oncmp/matches"],
    ["1678", "2026casj", "https://www.thebluealliance.com/api/v3/team/frc1678/event/2026casj/matches"],
  ] as const;

  it.each(endpointCases)(
    "builds endpoint for team=%s event=%s",
    async (teamKey, eventKey, expectedUrl) => {
      const service = new TBAService();
      service.setApiKey("test-key");
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
      vi.stubGlobal("fetch", fetchMock);

      await service.getTeamMatchesAtEvent(teamKey, eventKey);

      expect(fetchMock).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          headers: { "X-TBA-Auth-Key": "test-key" },
        }),
      );
    },
  );

  it("fetchAndParseTeamMatches delegates and parses", async () => {
    const service = new TBAService();
    const getTeamMatchesAtEventSpy = vi
      .spyOn(service, "getTeamMatchesAtEvent")
      .mockResolvedValue([
        {
          key: "qm1",
          comp_level: "qm",
          set_number: 1,
          match_number: 1,
          alliances: {
            red: { team_keys: ["frc1", "frc2", "frc3"] },
            blue: { team_keys: ["frc4", "frc5", "frc6"] },
          },
        },
      ]);

    const out = await service.fetchAndParseTeamMatches("1", "2026miket");
    expect(getTeamMatchesAtEventSpy).toHaveBeenCalledWith("1", "2026miket");
    expect(out[0].matchName).toBe("Quals 1");
  });

  it("fetchAndParseEvents delegates and parses", async () => {
    const service = new TBAService();
    const getEventsSpy = vi.spyOn(service, "getEvents").mockResolvedValue([
      {
        key: "2026miket",
        name: "Michigan Event",
        event_code: "miket",
        event_type: 0,
        start_date: "2026-03-01",
        end_date: "2026-03-03",
        year: 2026,
      },
    ]);

    const out = await service.fetchAndParseEvents(2026);
    expect(getEventsSpy).toHaveBeenCalledWith(2026);
    expect(out[0].dateRange).toBe("Mar 1-3");
  });

  it("fetchAndParseAllMatches delegates and parses", async () => {
    const service = new TBAService();
    const getMatchesAtEventSpy = vi.spyOn(service, "getMatchesAtEvent").mockResolvedValue([
      {
        key: "sf1m2",
        comp_level: "sf",
        set_number: 1,
        match_number: 2,
        alliances: {
          red: { team_keys: ["frc1", "frc2", "frc3"] },
          blue: { team_keys: ["frc4", "frc5", "frc6"] },
        },
      },
    ]);

    const out = await service.fetchAndParseAllMatches("2026miket");
    expect(getMatchesAtEventSpy).toHaveBeenCalledWith("2026miket");
    expect(out[0].matchName).toBe("Semis 1-2");
  });
}
);
