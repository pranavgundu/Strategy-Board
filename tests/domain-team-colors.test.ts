import { describe, expect, it } from "vitest";

import { emptyBoardConfig, readBoardConfig, removeTeamColorOverride, resolveTeamColor, setTeamColorOverride } from "$lib/domain";

describe("Team Colors", () => {
  it("come from the scouting app's color table", () => {
    expect(resolveTeamColor("1690")).toBe("#0100fc");
  });

  it("fall back to the scouting app's palette by team number for a team missing from the table", () => {
    expect(resolveTeamColor("11480")).toBe("#99b125");
  });

  it("use this device's override first", () => {
    expect(resolveTeamColor("1690", { "1690": "#33aaff" })).toBe("#33aaff");
    expect(resolveTeamColor("11480", { "11480": "#ff8800" })).toBe("#ff8800");
  });

  it("can be overridden, changed, and reset on the device through the Board Config", () => {
    let config = setTeamColorOverride(emptyBoardConfig(), "1690", "#33AAFF");
    expect(resolveTeamColor("1690", config.teamColors)).toBe("#33aaff");

    config = setTeamColorOverride(config, "1690", "#ffffff");
    expect(resolveTeamColor("1690", config.teamColors)).toBe("#ffffff");

    config = removeTeamColorOverride(config, "1690");
    expect(resolveTeamColor("1690", config.teamColors)).toBe("#0100fc");
  });

  it("keep only valid overrides when a stored Board Config is read back", () => {
    const config = readBoardConfig({ teamColors: { "1690": "#33AAFF", "0254": "#00ff00", nope: "#123456", "4590": "red" } });

    expect(config.teamColors).toEqual({ "1690": "#33aaff", "254": "#00ff00" });
    expect(readBoardConfig(null)).toEqual(emptyBoardConfig());
  });
});
