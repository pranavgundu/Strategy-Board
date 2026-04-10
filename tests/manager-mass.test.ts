import { describe, expect, it, vi } from "vitest";
import {
  getAvailableFieldYears,
  getFieldImageForYear,
  getLatestFieldYear,
  getRobotPositionsForYear,
  getYearFromFieldImage,
  hasFieldForYear,
  preloadFieldImages,
} from "../src/manager.ts";

describe("manager mass field-image coverage", () => {
  const image2025 = getFieldImageForYear(2025);
  const image2026 = getFieldImageForYear(2026);

  const fallbackCases = [
    [undefined, 2026],
    [1900, 2025],
    [2024, 2025],
    [2025, 2025],
    [2025.1, 2025],
    [2025.999, 2025],
    [2026, 2026],
    [2026.1, 2026],
    [2099, 2026],
    [-100, 2025],
    [0, 2026],
    [NaN, 2026],
  ] as const;

  it.each(fallbackCases)(
    "returns expected field for year=%s -> %d",
    (year, expectedYear) => {
      const actual = getFieldImageForYear(year as number | undefined);
      expect(actual).toBe(expectedYear === 2026 ? image2026 : image2025);
    },
  );

  const yearLookupCases = [
    [image2025, 2025],
    [image2026, 2026],
    ["/assets/not-real.png", undefined],
    ["", undefined],
    ["2025.png", undefined],
  ] as const;

  it.each(yearLookupCases)("maps URL '%s' to year %s", (url, expectedYear) => {
    expect(getYearFromFieldImage(url)).toBe(expectedYear);
  });

  const hasFieldCases = [
    [2024, false],
    [2025, true],
    [2026, true],
    [2027, false],
    [0, false],
    [-1, false],
  ] as const;

  it.each(hasFieldCases)("hasFieldForYear(%d) => %s", (year, expected) => {
    expect(hasFieldForYear(year)).toBe(expected);
  });

  it("returns sorted years and latest year consistently", () => {
    expect(getAvailableFieldYears()).toEqual(["2025", "2026"]);
    expect(getLatestFieldYear()).toBe(2026);
  });
});

describe("manager mass robot-position coverage", () => {
  const pos2025 = getRobotPositionsForYear(2025);
  const pos2026 = getRobotPositionsForYear(2026);

  const positionCases = [
    [undefined, 2026],
    [2025, 2025],
    [2025.2, 2025],
    [2025.9, 2025],
    [2026, 2026],
    [2026.2, 2026],
    [1900, 2025],
    [2100, 2026],
    [0, 2026],
    [NaN, 2026],
  ] as const;

  it.each(positionCases)("returns expected robot map for year=%s -> %d", (year, expectedYear) => {
    const actual = getRobotPositionsForYear(year as number | undefined);
    if (expectedYear === 2026) {
      expect(actual.red.one.x).toBe(pos2026.red.one.x);
      expect(actual.blue.three.y).toBe(pos2026.blue.three.y);
    } else {
      expect(actual.red.one.x).toBe(pos2025.red.one.x);
      expect(actual.blue.three.y).toBe(pos2025.blue.three.y);
    }
  });

  it("keeps red and blue x coordinates mirrored by year", () => {
    expect(pos2025.red.one.x).not.toBe(pos2025.blue.one.x);
    expect(pos2026.red.one.x).not.toBe(pos2026.blue.one.x);
  });

  it("keeps y lanes aligned between alliances", () => {
    expect(pos2025.red.one.y).toBe(pos2025.blue.one.y);
    expect(pos2025.red.two.y).toBe(pos2025.blue.two.y);
    expect(pos2026.red.three.y).toBe(pos2026.blue.three.y);
  });
});

describe("preloadFieldImages", () => {
  it("resolves when all images load", async () => {
    const created: Array<{ onload: (() => void) | null; onerror: (() => void) | null; _src: string }> = [];

    class ImageOk {
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public _src = "";
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
    }

    const originalImage = globalThis.Image;
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("Image", ImageOk as unknown as typeof Image);

    await preloadFieldImages();

    expect(consoleLogSpy).toHaveBeenCalled();

    vi.stubGlobal("Image", originalImage);
    void created;
  });

  it("warns when one image fails", async () => {
    class ImageMixed {
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      private static count = 0;
      set src(_value: string) {
        ImageMixed.count += 1;
        queueMicrotask(() => {
          if (ImageMixed.count === 1) {
            this.onload?.();
          } else {
            this.onerror?.();
          }
        });
      }
    }

    const originalImage = globalThis.Image;
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("Image", ImageMixed as unknown as typeof Image);

    await preloadFieldImages();

    expect(consoleWarnSpy).toHaveBeenCalled();

    vi.stubGlobal("Image", originalImage);
  });
});
