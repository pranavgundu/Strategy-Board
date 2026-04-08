import { describe, expect, it } from "vitest";
import { Config } from "../src/config.ts";

describe("Config", () => {
  it("contains valid field dimensions and station coordinates", () => {
    expect(Config.fieldPNGPixelWidth).toBeGreaterThan(0);
    expect(Config.fieldPNGPixelHeight).toBeGreaterThan(0);
    expect(Config.fieldRealWidthInches).toBeGreaterThan(0);
    expect(Config.fieldRealHeightInches).toBeGreaterThan(0);

    expect(Config.redOneStationX).toBeTypeOf("number");
    expect(Config.redTwoStationX).toBeTypeOf("number");
    expect(Config.redThreeStationX).toBeTypeOf("number");
    expect(Config.blueOneStationX).toBeTypeOf("number");
    expect(Config.blueTwoStationX).toBeTypeOf("number");
    expect(Config.blueThreeStationX).toBeTypeOf("number");
  });

  it("exposes release announcement config contract", () => {
    expect(Config.releaseAnnouncement).toMatchObject({
      enabled: expect.any(Boolean),
      id: expect.any(String),
      title: expect.any(String),
      message: expect.any(String),
      ctaLabel: expect.any(String),
      ctaUrl: expect.any(String),
      showOnce: expect.any(Boolean),
    });
  });
});
