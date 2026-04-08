import { describe, expect, it } from "vitest";
import { fuzzyMatch, fuzzySearchItems } from "../src/search.ts";

describe("fuzzyMatch scoring", () => {
  it("scores substring at start higher than substring in middle", () => {
    const atStart = fuzzyMatch("det", "detroit michigan");
    const inMiddle = fuzzyMatch("det", "the detroit area");

    expect(atStart).not.toBeNull();
    expect(inMiddle).not.toBeNull();
    expect(atStart!.score).toBeGreaterThan(inMiddle!.score);
  });

  it("scores consecutive characters higher than spread characters", () => {
    const consecutive = fuzzyMatch("abc", "abcdef");
    const spread = fuzzyMatch("abc", "axbxcx");

    expect(consecutive).not.toBeNull();
    expect(spread).not.toBeNull();
    expect(consecutive!.score).toBeGreaterThan(spread!.score);
  });

  it("returns null when search is longer than target", () => {
    expect(fuzzyMatch("longersearch", "short")).toBeNull();
  });

  it("scores word boundary matches higher", () => {
    const boundary = fuzzyMatch("ms", "match-schedule");
    const noBoundary = fuzzyMatch("ms", "membership");

    expect(boundary).not.toBeNull();
    expect(noBoundary).not.toBeNull();
    expect(boundary!.score).toBeGreaterThan(noBoundary!.score);
  });

  it("applies first-char bonus", () => {
    const firstChar = fuzzyMatch("ab", "abcd");
    const notFirst = fuzzyMatch("ab", "xabcd");

    expect(firstChar).not.toBeNull();
    expect(notFirst).not.toBeNull();
    expect(firstChar!.score).toBeGreaterThan(notFirst!.score);
  });

  it("handles numeric team number searches", () => {
    const result = fuzzyMatch("1114", "1114 simbotics");
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0, 1, 2, 3]);
  });

  it("handles single character search", () => {
    const result = fuzzyMatch("a", "abcdef");
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0]);
  });
});

describe("fuzzySearchItems advanced", () => {
  it("filters below minScore threshold", () => {
    const el = document.createElement("div");
    const matches = fuzzySearchItems(
      [{
        element: el,
        searchableText: "something completely different",
        name: "Something",
        details: "Completely different",
        key: "xyz",
      }],
      "zzz",
      999,
    );

    expect(matches).toHaveLength(0);
  });

  it("returns all items with empty search and default minScore", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("div");

    const matches = fuzzySearchItems(
      [
        { element: el1, searchableText: "a", name: "A", details: "", key: "1" },
        { element: el2, searchableText: "b", name: "B", details: "", key: "2" },
      ],
      "",
    );

    expect(matches).toHaveLength(2);
  });

  it("ranks exact key match highly", () => {
    const elKey = document.createElement("div");
    const elName = document.createElement("div");

    const matches = fuzzySearchItems(
      [
        { element: elName, searchableText: "some event", name: "Some Event", details: "Info", key: "2026abc" },
        { element: elKey, searchableText: "2026miket", name: "Michigan", details: "", key: "2026miket" },
      ],
      "2026miket",
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].item).toBe(elKey);
  });
});
