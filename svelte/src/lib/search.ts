import { fuzzyMatchCore, fuzzySearchBatch } from "./wasm/index.ts";

export interface FuzzyMatch {
  item: HTMLElement;
  score: number;
  matchedIndices: number[];
}

export interface SearchableItem {
  element: HTMLElement;
  searchableText: string;
  name: string;
  details: string;
  key: string;
}

export function fuzzyMatch(
  searchTerm: string,
  target: string,
  originalTarget?: string,
): { score: number; matchedIndices: number[] } | null {
  return fuzzyMatchCore(searchTerm, target, originalTarget) as {
    score: number;
    matchedIndices: number[];
  } | null;
}

export function fuzzySearchItems(
  items: SearchableItem[],
  searchTerm: string,
  minScore: number = 0,
): FuzzyMatch[] {
  const payload = items.map((item) => ({
    name: item.name,
    nameLower: item.name.toLowerCase(),
    details: item.details,
    detailsLower: item.details.toLowerCase(),
    key: item.key,
    keyLower: item.key.toLowerCase(),
  }));

  const results = fuzzySearchBatch(
    payload,
    searchTerm.toLowerCase(),
    minScore,
  ) as Array<{ index: number; score: number; matchedIndices: number[] }>;

  return results.map((result) => ({
    item: items[result.index].element,
    score: result.score,
    matchedIndices: result.matchedIndices,
  }));
}

export function extractEventItems(container: HTMLElement): SearchableItem[] {
  const items: SearchableItem[] = [];
  const elements = container.querySelectorAll(".tba-dropdown-item");

  elements.forEach((element) => {
    const el = element as HTMLElement;
    const name = el.querySelector(".tba-event-name")?.textContent || "";
    const details = el.querySelector(".tba-event-details")?.textContent || "";
    const key = el.dataset.eventKey || "";

    items.push({
      element: el,
      searchableText: `${name} ${details} ${key}`.toLowerCase(),
      name,
      details,
      key,
    });
  });

  return items;
}

export function extractTeamItems(container: HTMLElement): SearchableItem[] {
  const items: SearchableItem[] = [];
  const elements = container.querySelectorAll(".tba-team-item");

  elements.forEach((element) => {
    const el = element as HTMLElement;
    const teamNumber = el.dataset.teamNumber || "";
    const text = el.textContent || "";

    items.push({
      element: el,
      searchableText: text.toLowerCase(),
      name: text,
      details: "",
      key: teamNumber,
    });
  });

  return items;
}
