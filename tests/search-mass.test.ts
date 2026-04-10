import { describe, expect, it } from "vitest";
import {
  extractEventItems,
  extractTeamItems,
  fuzzyMatch,
  fuzzySearchItems,
} from "../src/search.ts";

describe("fuzzyMatch mass coverage", () => {
  const exactCases = [
    "a",
    "qm",
    "event",
    "strategy",
    "board",
    "2026miket",
    "alpha-beta",
    "frc2056",
    "semis",
    "finals",
  ];

  it.each(exactCases)("exact match scores high for %s", (term) => {
    const result = fuzzyMatch(term, term);
    expect(result).not.toBeNull();
    expect(result?.matchedIndices).toEqual(
      Array.from({ length: term.length }, (_, i) => i),
    );
    expect((result?.score ?? 0) > 100).toBe(true);
  });

  const boundaryCases = [
    ["ef", "ef schedule", "space"],
    ["ef", "x-ef schedule", "dash"],
    ["ef", "x_ef schedule", "underscore"],
    ["ef", "x.ef schedule", "dot"],
    ["ef", "x,ef schedule", "comma"],
    ["ef", "x(ef schedule", "open paren"],
    ["ef", "x)ef schedule", "close paren"],
    ["ef", "x/ef schedule", "slash"],
    ["ef", "x\\ef schedule", "backslash"],
  ] as const;

  it.each(boundaryCases)(
    "word boundary bonus applies for %s after %s separator",
    (term, target) => {
      const boundary = fuzzyMatch(term, target);
      const nonBoundary = fuzzyMatch(term, `xx${term}yy`);

      expect(boundary).not.toBeNull();
      expect(nonBoundary).not.toBeNull();
      expect((boundary?.score ?? 0) > (nonBoundary?.score ?? 0)).toBe(true);
    },
  );

  const fuzzyCases = [
    ["sb", "strategyboard", "StrategyBoard"],
    ["tb", "thebluealliance", "TheBlueAlliance"],
    ["mr", "matchreport", "MatchReport"],
    ["cv", "codeviewer", "CodeViewer"],
    ["dt", "drivetrain", "DriveTrain"],
    ["pg", "pathgenerator", "PathGenerator"],
    ["ra", "robotanalysis", "RobotAnalysis"],
    ["qd", "quickdraw", "QuickDraw"],
    ["wm", "whiteboardmanager", "WhiteboardManager"],
    ["cp", "cloudprovider", "CloudProvider"],
  ] as const;

  it.each(fuzzyCases)(
    "camelCase boundaries increase score for %s in %s",
    (term, lower, original) => {
      const camel = fuzzyMatch(term, lower, original);
      const plain = fuzzyMatch(term, lower, lower);

      expect(camel).not.toBeNull();
      expect(plain).not.toBeNull();
      expect((camel?.score ?? 0) > (plain?.score ?? 0)).toBe(true);
    },
  );

  const nullCases = [
    ["abc", ""],
    ["abcd", "abc"],
    ["xyz", "event"],
    ["zz", "quals"],
    ["999", "frc111"],
  ] as const;

  it.each(nullCases)("returns null when no match: %s vs %s", (term, target) => {
    expect(fuzzyMatch(term, target)).toBeNull();
  });

  const emptyTermCases = ["", "", "2026", "quals", "team 1114"];

  it.each(emptyTermCases)("empty term returns neutral result for '%s'", (target) => {
    expect(fuzzyMatch("", target)).toEqual({ score: 0, matchedIndices: [] });
  });
});

describe("fuzzySearchItems mass coverage", () => {
  const makeItem = (
    name: string,
    details: string,
    key: string,
    id: string,
  ) => ({
    element: Object.assign(document.createElement("div"), { id }),
    searchableText: `${name} ${details} ${key}`.toLowerCase(),
    name,
    details,
    key,
  });

  const scoreCases = [
    ["strategy", "Strategy Board", "General planning", "abc", "name"],
    ["planning", "General board", "Planning details", "abc", "details"],
    ["254", "General board", "No team here", "frc254", "key"],
    ["miket", "Michigan Event", "Week 2", "2026miket", "key"],
    ["semis", "Semis 1", "Playoffs", "sf1", "name"],
    ["canada", "Ontario Regional", "Toronto, Canada", "cada", "details"],
    ["quals", "Quals 3", "Schedule", "qm3", "name"],
    ["district", "District Event", "Week 1", "dist", "name"],
    ["team", "Team Picker", "Select team", "tp", "name"],
    ["1114", "Simbotics", "Legend team", "1114", "key"],
  ] as const;

  it.each(scoreCases)(
    "returns one top match for %s from %s",
    (searchTerm, name, details, key) => {
      const strong = makeItem(name, details, key, "strong");
      const weak = makeItem("Other", "Elsewhere", "zzz", "weak");

      const matches = fuzzySearchItems([weak, strong], searchTerm, 1);
      expect(matches).toHaveLength(1);
      expect(matches[0].item).toBe(strong.element);
    },
  );

  const thresholdCases = [10, 30, 50, 70, 90];

  it.each(thresholdCases)("filters out weak results under minScore=%d", (minScore) => {
    const weak = makeItem("Alpha", "Bravo", "charlie", "weak");
    const result = fuzzySearchItems([weak], "zz", minScore);
    expect(result).toHaveLength(0);
  });
});

describe("search item extraction mass coverage", () => {
  it("extractEventItems handles mixed DOM completeness", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="tba-dropdown-item" data-event-key="2026miket">
        <div class="tba-event-name">Michigan District</div>
        <div class="tba-event-details">Week 2</div>
      </div>
      <div class="tba-dropdown-item" data-event-key="2026cada">
        <div class="tba-event-name">Canada Regional</div>
      </div>
      <div class="tba-dropdown-item">
        <div class="tba-event-details">No name case</div>
      </div>
      <div class="ignore-me">Not an item</div>
    `;

    const items = extractEventItems(container);
    expect(items).toHaveLength(3);
    expect(items[0].key).toBe("2026miket");
    expect(items[1].details).toBe("");
    expect(items[2].name).toBe("");
  });

  const teamRows = [
    ["1114", "1114 - Simbotics"],
    ["2056", "2056 - OP Robotics"],
    ["254", "254 - Cheesy Poofs"],
    ["1678", "1678 - Citrus Circuits"],
    ["148", "148 - Robowranglers"],
    ["971", "971 - Spartan Robotics"],
    ["118", "118 - Robonauts"],
    ["1323", "1323 - Madtown"],
    ["2910", "2910 - Jack in the Bot"],
    ["4414", "4414 - HighTide"],
  ] as const;

  it.each(teamRows)("extracts team item %s", (teamNumber, label) => {
    const container = document.createElement("div");
    container.innerHTML = `<div class="tba-team-item" data-team-number="${teamNumber}">${label}</div>`;
    const items = extractTeamItems(container);

    expect(items).toHaveLength(1);
    expect(items[0].key).toBe(teamNumber);
    expect(items[0].name).toContain(teamNumber);
    expect(items[0].searchableText).toContain(teamNumber);
  });
});
