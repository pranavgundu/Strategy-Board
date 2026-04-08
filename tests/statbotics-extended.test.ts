import { describe, expect, it, vi, beforeEach } from "vitest";
import { StatboticsService } from "../src/statbotics.ts";

describe("StatboticsService constructMatchKey", () => {
  const service = new StatboticsService();

  it("handles eighths format", () => {
    expect(service.constructMatchKey("2026miket", "Eighths 4-2")).toBe("2026miket_ef4m2");
  });

  it("handles quarters format", () => {
    expect(service.constructMatchKey("2026miket", "Quarters 3-1")).toBe("2026miket_qf3m1");
  });

  it("handles finals with set-match format", () => {
    expect(service.constructMatchKey("2026miket", "Finals 1-2")).toBe("2026miket_f1m2");
  });

  it("handles finals without set number", () => {
    expect(service.constructMatchKey("2026miket", "Finals 3")).toBe("2026miket_f3");
  });

  it("strips @ suffix from match name", () => {
    expect(service.constructMatchKey("2026miket", "Quals 7 @ 3:15 PM")).toBe("2026miket_qm7");
  });

  it("defaults to match 1 when no number found", () => {
    expect(service.constructMatchKey("2026miket", "Quals")).toBe("2026miket_qm1");
  });
});

describe("StatboticsService getMatchData edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles all team 404s gracefully", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockRejectedValue(new Error("Statbotics API error: 404 - Data not found"));
    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockRejectedValue(new Error("Statbotics API error: 404 - Data not found"));

    const data = await service.getMatchData("2026miket_qm99", [9990, 9991, 9992], [9993, 9994, 9995], 2026);

    expect(data.redTeamEPAs.size).toBe(0);
    expect(data.blueTeamEPAs.size).toBe(0);
    expect(data.redWinProbability).toBe(0.5);
    expect(data.blueWinProbability).toBe(0.5);
    expect(data.hadErrors).toBe(false);
  });

  it("sets 50/50 when EPA sums are zero", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockRejectedValue(new Error("Statbotics API error: 500 - Server error"));
    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockImplementation(async (team: number) => ({
      team,
      year: 2026,
      epa: { total_points: { mean: 0 } },
    }) as any);

    const data = await service.getMatchData("2026miket_qm5", [1, 2, 3], [4, 5, 6], 2026);

    expect(data.redWinProbability).toBe(0.5);
    expect(data.blueWinProbability).toBe(0.5);
  });

  it("populates teamDetails with correct breakdown data", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockResolvedValue({
      key: "k",
      year: 2026,
      event: "e",
      comp_level: "qm",
      set_number: 1,
      match_number: 1,
      match_name: "Q1",
      pred: { red_win_prob: 0.6 },
    } as any);
    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockImplementation(async (team: number) => ({
      team,
      year: 2026,
      name: `Team ${team}`,
      epa: {
        total_points: { mean: 40 },
        breakdown: { auto_points: 10, teleop_points: 20, endgame_points: 10 },
        ranks: { total: { rank: 5, percentile: 85 } },
      },
    }) as any);

    const data = await service.getMatchData("k", [100], [200], 2026);

    const detail = data.teamDetails.get(100);
    expect(detail).toBeDefined();
    expect(detail!.totalEPA).toBe(40);
    expect(detail!.autoEPA).toBe(10);
    expect(detail!.teleopEPA).toBe(20);
    expect(detail!.endgameEPA).toBe(10);
    expect(detail!.rank).toBe(5);
    expect(detail!.percentile).toBe(85);
    expect(detail!.teamName).toBe("Team 100");
  });

  it("uses fallback EPA fields when mean is missing", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockResolvedValue({
      key: "k",
      year: 2026,
      event: "e",
      comp_level: "qm",
      set_number: 1,
      match_number: 1,
      match_name: "Q1",
      pred: { red_win_prob: 0.5 },
    } as any);
    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockImplementation(async (team: number) => ({
      team,
      year: 2026,
      name: `Team ${team}`,
      epa: {
        stats: { max: 55 },
      },
    }) as any);

    const data = await service.getMatchData("k", [1], [2], 2026);

    expect(data.teamDetails.get(1)!.totalEPA).toBe(55);
  });
});
