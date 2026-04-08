import { describe, expect, it, vi, beforeEach } from "vitest";
import { TBAService, type TBAMatch, type TBASimpleEvent } from "../src/tba.ts";

describe("TBAService formatDateRange", () => {
  const service = new TBAService();

  it("formats cross-month date ranges", () => {
    const events = service.parseEventsToSimple([
      {
        key: "2026cross",
        name: "Cross Month",
        event_code: "cross",
        event_type: 0,
        start_date: "2026-03-30",
        end_date: "2026-04-01",
        year: 2026,
        city: "Test",
        state_prov: "TS",
        country: "USA",
      },
    ]);

    expect(events[0].dateRange).toBe("Mar 30 - Apr 1");
  });

  it("handles single-day events", () => {
    const events = service.parseEventsToSimple([
      {
        key: "2026one",
        name: "One Day",
        event_code: "one",
        event_type: 0,
        start_date: "2026-06-15",
        end_date: "2026-06-15",
        year: 2026,
      },
    ]);

    expect(events[0].dateRange).toBe("Jun 15-15");
  });

  it("handles year-boundary dates correctly in UTC", () => {
    const events = service.parseEventsToSimple([
      {
        key: "2026nye",
        name: "New Year Event",
        event_code: "nye",
        event_type: 0,
        start_date: "2026-12-31",
        end_date: "2027-01-02",
        year: 2026,
      },
    ]);

    expect(events[0].dateRange).toBe("Dec 31 - Jan 2");
  });
});

describe("TBAService parseEventsToSimple location edge cases", () => {
  const service = new TBAService();

  it("handles city only", () => {
    const events = service.parseEventsToSimple([
      {
        key: "k1",
        name: "E",
        event_code: "e",
        event_type: 0,
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        year: 2026,
        city: "Detroit",
      },
    ]);
    expect(events[0].location).toBe("Detroit");
  });

  it("handles state_prov only", () => {
    const events = service.parseEventsToSimple([
      {
        key: "k2",
        name: "E",
        event_code: "e",
        event_type: 0,
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        year: 2026,
        state_prov: "MI",
      },
    ]);
    expect(events[0].location).toBe("MI");
  });

  it("handles no location data", () => {
    const events = service.parseEventsToSimple([
      {
        key: "k3",
        name: "E",
        event_code: "e",
        event_type: 0,
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        year: 2026,
      },
    ]);
    expect(events[0].location).toBe("");
  });

  it("appends non-USA country to city+state", () => {
    const events = service.parseEventsToSimple([
      {
        key: "k4",
        name: "E",
        event_code: "e",
        event_type: 0,
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        year: 2026,
        city: "Istanbul",
        state_prov: "IST",
        country: "Turkey",
      },
    ]);
    expect(events[0].location).toBe("Istanbul, IST, Turkey");
  });

  it("does not append USA as country", () => {
    const events = service.parseEventsToSimple([
      {
        key: "k5",
        name: "E",
        event_code: "e",
        event_type: 0,
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        year: 2026,
        city: "Detroit",
        state_prov: "MI",
        country: "USA",
      },
    ]);
    expect(events[0].location).toBe("Detroit, MI");
  });
});

describe("TBAService formatMatchName", () => {
  const service = new TBAService();

  it("formats all comp levels correctly", () => {
    const makeMatch = (level: string, set: number, num: number): TBAMatch => ({
      key: `k_${level}`,
      comp_level: level,
      set_number: set,
      match_number: num,
      alliances: { red: { team_keys: ["frc1"] }, blue: { team_keys: ["frc2"] } },
    });

    const simple = service.parseMatchesToSimple([
      makeMatch("qm", 1, 5),
      makeMatch("ef", 2, 1),
      makeMatch("qf", 1, 3),
      makeMatch("sf", 2, 2),
      makeMatch("f", 1, 1),
    ]);

    expect(simple[0].matchName).toBe("Quals 5");
    expect(simple[1].matchName).toBe("Eighths 2-1");
    expect(simple[2].matchName).toBe("Quarters 1-3");
    expect(simple[3].matchName).toBe("Semis 2-2");
    expect(simple[4].matchName).toBe("Finals 1-1");
  });

  it("handles unknown comp levels", () => {
    const simple = service.parseMatchesToSimple([
      {
        key: "k",
        comp_level: "xx",
        set_number: 1,
        match_number: 1,
        alliances: { red: { team_keys: ["frc1"] }, blue: { team_keys: ["frc2"] } },
      },
    ]);
    expect(simple[0].matchName).toBe("XX 1-1");
  });
});

describe("TBAService hasApiKey", () => {
  it("returns true after setting a key", () => {
    const service = new TBAService();
    service.setApiKey("abc123");
    expect(service.hasApiKey()).toBe(true);
  });
});

describe("TBAService makeRequest errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws on non-ok response", async () => {
    const service = new TBAService();
    service.setApiKey("key");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    }));

    await expect(service.getEvents(2026)).rejects.toThrow("TBA API error: 403 Forbidden");
  });
});

describe("TBAService filterAndSortEvents edge cases", () => {
  const service = new TBAService();

  it("excludes events with unparseable dateRange", () => {
    const events: TBASimpleEvent[] = [
      { key: "ok", name: "Ok", location: "", dateRange: "Mar 1-2", year: 2026 },
      { key: "bad1", name: "Bad", location: "", dateRange: "", year: 2026 },
      { key: "bad2", name: "Bad", location: "", dateRange: "Xyz 1-2", year: 2026 },
    ];

    const result = service.filterAndSortEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("ok");
  });

  it("includes events exactly on Jan 1 2025", () => {
    const events: TBASimpleEvent[] = [
      { key: "exact", name: "Exact", location: "", dateRange: "Jan 1-3", year: 2025 },
    ];

    const result = service.filterAndSortEvents(events);
    expect(result).toHaveLength(1);
  });

  it("sorts newest events first", () => {
    const events: TBASimpleEvent[] = [
      { key: "early", name: "Early", location: "", dateRange: "Feb 1-2", year: 2026 },
      { key: "late", name: "Late", location: "", dateRange: "Nov 1-2", year: 2026 },
      { key: "mid", name: "Mid", location: "", dateRange: "Jun 1-2", year: 2026 },
    ];

    const result = service.filterAndSortEvents(events);
    expect(result.map((e) => e.key)).toEqual(["late", "mid", "early"]);
  });
});
