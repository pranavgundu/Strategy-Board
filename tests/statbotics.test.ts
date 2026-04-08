import { describe, expect, it, vi } from "vitest";
import { StatboticsService } from "../src/statbotics.ts";

describe("StatboticsService", () => {
  it("constructs match keys for qualification and playoff formats", () => {
    const service = new StatboticsService();

    expect(service.constructMatchKey("2026miket", "Quals 12")).toBe("2026miket_qm12");
    expect(service.constructMatchKey("2026miket", "Semis 2-1")).toBe("2026miket_sf2m1");
    expect(service.constructMatchKey("2026miket", "Finals 3")).toBe("2026miket_f3");
  });

  it("uses match prediction when match data is available", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockResolvedValue({
      key: "2026miket_qm1",
      year: 2026,
      event: "2026miket",
      comp_level: "qm",
      set_number: 1,
      match_number: 1,
      match_name: "Quals 1",
      pred: { red_win_prob: 0.8 },
      result: { red_score: 120, blue_score: 90 },
    } as any);

    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockImplementation(async (team: number) => ({
      team,
      year: 2026,
      name: `Team ${team}`,
      epa: {
        total_points: { mean: team },
        breakdown: { auto_points: 1, teleop_points: 2, endgame_points: 3 },
        ranks: { total: { rank: team, percentile: 90 } },
      },
    }) as any);

    const data = await service.getMatchData("2026miket_qm1", [1, 2, 3], [4, 5, 6], 2026);

    expect(data.redWinProbability).toBe(0.8);
    expect(data.blueWinProbability).toBeCloseTo(0.2);
    expect(data.hasScores).toBe(true);
    expect(data.redScore).toBe(120);
    expect(data.blueScore).toBe(90);
    expect(data.teamDetails.size).toBe(6);
  });

  it("falls back to EPA-sum probability when match endpoint fails", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockRejectedValue(new Error("Statbotics API error: 500 - Server error"));
    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockImplementation(async (team: number) => ({
      team,
      year: 2026,
      name: `Team ${team}`,
      epa: { total_points: { mean: team } },
    }) as any);

    const data = await service.getMatchData("2026miket_qm2", [1, 2, 3], [4, 5, 6], 2026);

    const redSum = 1 + 2 + 3;
    const blueSum = 4 + 5 + 6;
    expect(data.redWinProbability).toBeCloseTo(redSum / (redSum + blueSum));
    expect(data.blueWinProbability).toBeCloseTo(blueSum / (redSum + blueSum));
    expect(data.hadErrors).toBe(false);
    expect(data.match).toBeNull();
  });

  it("marks hadErrors on non-404 team data failures", async () => {
    const service = new StatboticsService();

    vi.spyOn(service, "getMatch").mockRejectedValue(new Error("Statbotics API error: 500 - Server error"));
    vi.spyOn(service, "getYear").mockResolvedValue(null as any);
    vi.spyOn(service, "getTeamYear").mockImplementation(async (team: number) => {
      if (team === 2) {
        throw new Error("network timeout");
      }
      return {
        team,
        year: 2026,
        name: `Team ${team}`,
        epa: { total_points: { mean: 10 } },
      } as any;
    });

    const data = await service.getMatchData("2026miket_qm3", [1, 2, 3], [4, 5, 6], 2026);

    expect(data.hadErrors).toBe(true);
    expect(data.redTeamEPAs.has(2)).toBe(false);
  });
});
