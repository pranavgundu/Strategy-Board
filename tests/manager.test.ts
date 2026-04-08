import { describe, expect, it } from "vitest";
import {
  getAvailableFieldYears,
  getFieldImageForYear,
  getLatestFieldYear,
  getRobotPositionsForYear,
  getYearFromFieldImage,
  hasFieldForYear,
} from "../src/manager.ts";

describe("manager", () => {
  it("returns sorted available years and latest year", () => {
    expect(getAvailableFieldYears()).toEqual(["2025", "2026"]);
    expect(getLatestFieldYear()).toBe(2026);
  });

  it("returns field image for exact and fallback years", () => {
    const y2025 = getFieldImageForYear(2025);
    const y2026 = getFieldImageForYear(2026);

    expect(getFieldImageForYear()).toBe(y2026);
    expect(getFieldImageForYear(1900)).toBe(y2025);
    expect(getFieldImageForYear(9999)).toBe(y2026);
    expect(getFieldImageForYear(2025.8)).toBe(y2025);
  });

  it("maps image URL back to year and checks availability", () => {
    const y2026 = getFieldImageForYear(2026);

    expect(getYearFromFieldImage(y2026)).toBe(2026);
    expect(getYearFromFieldImage("/unknown.png")).toBeUndefined();
    expect(hasFieldForYear(2025)).toBe(true);
    expect(hasFieldForYear(2030)).toBe(false);
  });

  it("returns robot positions for exact and fallback years", () => {
    const y2025 = getRobotPositionsForYear(2025);
    const y2026 = getRobotPositionsForYear(2026);

    expect(getRobotPositionsForYear().red.one.x).toBe(y2026.red.one.x);
    expect(getRobotPositionsForYear(1900).red.one.x).toBe(y2025.red.one.x);
    expect(getRobotPositionsForYear(9999).blue.one.x).toBe(y2026.blue.one.x);
    expect(getRobotPositionsForYear(2025.2).red.one.x).toBe(y2025.red.one.x);
  });
});
