import { describe, expect, it } from "vitest";

import { normalizeTeamNumber } from "../src/lib/features/preferences";

describe("team number preferences", () => {
  it("normalizes valid FRC team numbers", () => {
    expect(normalizeTeamNumber(" 254 ")).toBe("254");
    expect(normalizeTeamNumber("99999")).toBe("99999");
  });

  it("rejects invalid, zero, padded, and oversized team numbers", () => {
    for (const value of ["", "0", "000254", "-254", "25.4", "100000", "abc"]) {
      expect(normalizeTeamNumber(value)).toBeNull();
    }
  });
});
