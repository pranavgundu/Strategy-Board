import { describe, expect, it } from "vitest";
import {
  extractEventItems,
  extractTeamItems,
  fuzzyMatch,
  fuzzySearchItems,
} from "../src/search.ts";

describe("fuzzyMatch", () => {
  it("returns exact-match indices and a strong score", () => {
    const result = fuzzyMatch("event", "event");
    expect(result).not.toBeNull();
    expect(result?.matchedIndices).toEqual([0, 1, 2, 3, 4]);
    expect((result?.score ?? 0) > 100).toBe(true);
  });

  it("returns null when no match is possible", () => {
    const result = fuzzyMatch("xyz", "event");
    expect(result).toBeNull();
  });

  it("rewards start-of-word matching", () => {
    const strong = fuzzyMatch("mike", "mike event");
    const weak = fuzzyMatch("mike", "the mike event");

    expect(strong).not.toBeNull();
    expect(weak).not.toBeNull();
    expect((strong?.score ?? 0) > (weak?.score ?? 0)).toBe(true);
  });

  it("handles empty and missing target values safely", () => {
    expect(fuzzyMatch("", "anything")).toEqual({
      score: 0,
      matchedIndices: [],
    });
    expect(fuzzyMatch("abc", "")).toBeNull();
  });

  it("rewards camelCase boundary matches", () => {
    const camel = fuzzyMatch("sb", "strategyboard", "StrategyBoard");
    const plain = fuzzyMatch("sb", "strategyboard", "strategyboard");

    expect(camel).not.toBeNull();
    expect(plain).not.toBeNull();
    expect((camel?.score ?? 0) > (plain?.score ?? 0)).toBe(true);
  });
});

describe("fuzzySearchItems", () => {
  it("sorts by best score and filters by minScore", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("div");

    const matches = fuzzySearchItems(
      [
        {
          element: el1,
          searchableText: "miket district event 2026miket",
          name: "MIKET District",
          details: "Michigan Event",
          key: "2026miket",
        },
        {
          element: el2,
          searchableText: "another event",
          name: "Another Event",
          details: "Elsewhere",
          key: "2026else",
        },
      ],
      "miket",
      1,
    );

    expect(matches.length).toBe(1);
    expect(matches[0].item).toBe(el1);
  });

  it("prefers name matches over details/key with name boost", () => {
    const nameEl = document.createElement("div");
    const detailsEl = document.createElement("div");

    const matches = fuzzySearchItems(
      [
        {
          element: detailsEl,
          searchableText: "something strategy board key",
          name: "General Item",
          details: "Strategy Board planning",
          key: "abc123",
        },
        {
          element: nameEl,
          searchableText: "strategy board name",
          name: "Strategy Board",
          details: "General details",
          key: "zzz999",
        },
      ],
      "strategy",
    );

    expect(matches[0].item).toBe(nameEl);
  });
});

describe("extractEventItems", () => {
  it("extracts names, details, keys, and searchable text", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="tba-dropdown-item" data-event-key="2026miket">
        <div class="tba-event-name">Michigan Event</div>
        <div class="tba-event-details">Week 2</div>
      </div>
      <div class="tba-dropdown-item" data-event-key="2026cada">
        <div class="tba-event-name">Canada Event</div>
      </div>
    `;

    const items = extractEventItems(container);

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Michigan Event");
    expect(items[0].details).toBe("Week 2");
    expect(items[0].key).toBe("2026miket");
    expect(items[1].details).toBe("");
    expect(items[1].searchableText).toContain("canada event");
  });
});

describe("extractTeamItems", () => {
  it("extracts team items with team number key", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="tba-team-item" data-team-number="1114">1114 - Simbotics</div>
      <div class="tba-team-item" data-team-number="2056">2056 - OP Robotics</div>
    `;

    const items = extractTeamItems(container);

    expect(items).toHaveLength(2);
    expect(items[0].key).toBe("1114");
    expect(items[0].name).toContain("Simbotics");
    expect(items[0].searchableText).toContain("1114");
    expect(items[1].key).toBe("2056");
  });
});
