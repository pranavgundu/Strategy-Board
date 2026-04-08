import { describe, expect, it } from "vitest";
import {
  getFieldImageForYear,
  getLatestFieldYear,
  getRobotPositionsForYear,
  getAvailableFieldYears,
  hasFieldForYear,
  getYearFromFieldImage,
} from "../src/manager.ts";

describe("manager robot positions", () => {
  it("2026 red and blue positions are on opposite sides of the field", () => {
    const pos = getRobotPositionsForYear(2026);
    expect(pos.red.one.x).toBeGreaterThan(pos.blue.one.x);
    expect(pos.red.two.x).toBeGreaterThan(pos.blue.two.x);
    expect(pos.red.three.x).toBeGreaterThan(pos.blue.three.x);
  });

  it("each alliance has three distinct vertical positions", () => {
    const pos = getRobotPositionsForYear(2026);
    const redYs = [pos.red.one.y, pos.red.two.y, pos.red.three.y];
    const blueYs = [pos.blue.one.y, pos.blue.two.y, pos.blue.three.y];

    expect(new Set(redYs).size).toBe(3);
    expect(new Set(blueYs).size).toBe(3);
  });

  it("2025 positions differ from 2026 positions", () => {
    const p25 = getRobotPositionsForYear(2025);
    const p26 = getRobotPositionsForYear(2026);

    expect(p25.red.one.x).not.toBe(p26.red.one.x);
  });

  it("fallback year between 2025 and 2026 returns 2025", () => {
    const pos = getRobotPositionsForYear(2025);
    const posMid = getRobotPositionsForYear(2025.5);
    expect(posMid.red.one.x).toBe(pos.red.one.x);
  });
});

describe("manager field images", () => {
  it("all available years have field images", () => {
    const years = getAvailableFieldYears().map(Number);
    for (const year of years) {
      expect(getFieldImageForYear(year)).toBeTruthy();
      expect(hasFieldForYear(year)).toBe(true);
    }
  });

  it("getYearFromFieldImage returns undefined for unknown URL", () => {
    expect(getYearFromFieldImage("not-a-real-url.png")).toBeUndefined();
  });

  it("getFieldImageForYear returns latest when called with no arg", () => {
    const latest = getLatestFieldYear();
    expect(getFieldImageForYear()).toBe(getFieldImageForYear(latest));
  });

  it("returns earliest image for very old year", () => {
    const years = getAvailableFieldYears().map(Number);
    const earliest = Math.min(...years);
    expect(getFieldImageForYear(1900)).toBe(getFieldImageForYear(earliest));
  });

  it("returns latest image for far future year", () => {
    const latest = getLatestFieldYear();
    expect(getFieldImageForYear(9999)).toBe(getFieldImageForYear(latest));
  });
});
