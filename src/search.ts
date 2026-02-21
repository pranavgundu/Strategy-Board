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

const SCORE_EXACT_MATCH = 100;
const SCORE_STARTS_WITH = 50;
const SCORE_WORD_BOUNDARY = 30;
const SCORE_CONSECUTIVE_BONUS = 15;
const SCORE_CAMEL_CASE_MATCH = 20;
const SCORE_CHARACTER_MATCH = 10;
const SCORE_GAP_PENALTY = -3;
const SCORE_FIRST_CHAR_BONUS = 15;

/**
 * Calculate a fuzzy match score between a search term and a target string.
 * Higher scores indicate better matches.
 *
 * @param searchTerm - The search query (lowercase)
 * @param target - The target string to match against (lowercase)
 * @param originalTarget - The original target string (for case analysis)
 * @returns Score and matched character indices, or null if no match
 */
export function fuzzyMatch(
  searchTerm: string,
  target: string,
  originalTarget?: string,
): { score: number; matchedIndices: number[] } | null {
  if (!searchTerm) {
    return { score: 0, matchedIndices: [] };
  }

  if (!target) {
    return null;
  }

  const original = originalTarget || target;

  if (target === searchTerm) {
    return {
      score: SCORE_EXACT_MATCH + searchTerm.length * SCORE_CHARACTER_MATCH,
      matchedIndices: Array.from({ length: searchTerm.length }, (_, i) => i),
    };
  }

  const exactIndex = target.indexOf(searchTerm);
  if (exactIndex !== -1) {
    const indices = Array.from(
      { length: searchTerm.length },
      (_, i) => exactIndex + i,
    );
    let score =
      SCORE_CHARACTER_MATCH * searchTerm.length +
      SCORE_CONSECUTIVE_BONUS * (searchTerm.length - 1);

    if (exactIndex === 0) {
      score += SCORE_STARTS_WITH;
    }

    if (exactIndex === 0 || isWordBoundary(target, exactIndex)) {
      score += SCORE_WORD_BOUNDARY;
    }

    return { score, matchedIndices: indices };
  }

  const matchResult = calculateFuzzyScore(searchTerm, target, original);
  return matchResult;
}

/**
 * Check if a position is at a word boundary
 */
function isWordBoundary(str: string, index: number): boolean {
  if (index === 0) return true;
  const prevChar = str[index - 1];
  return (
    prevChar === " " ||
    prevChar === "-" ||
    prevChar === "_" ||
    prevChar === "." ||
    prevChar === "," ||
    prevChar === "(" ||
    prevChar === ")" ||
    prevChar === "/" ||
    prevChar === "\\"
  );
}

/**
 * Check if a character is uppercase in the original string (camelCase boundary)
 */
function isCamelCaseBoundary(original: string, index: number): boolean {
  if (index === 0) return false;
  const char = original[index];
  const prevChar = original[index - 1];
  return char >= "A" && char <= "Z" && prevChar >= "a" && prevChar <= "z";
}

/**
 * Calculate fuzzy match score using a greedy algorithm with backtracking
 */
function calculateFuzzyScore(
  searchTerm: string,
  target: string,
  original: string,
): { score: number; matchedIndices: number[] } | null {
  const searchLen = searchTerm.length;
  const targetLen = target.length;

  if (searchLen > targetLen) {
    return null;
  }

  let searchIdx = 0;
  const matchedIndices: number[] = [];

  for (let i = 0; i < targetLen && searchIdx < searchLen; i++) {
    if (target[i] === searchTerm[searchIdx]) {
      matchedIndices.push(i);
      searchIdx++;
    }
  }

  if (searchIdx !== searchLen) {
    return null;
  }

  let score = 0;
  let consecutiveCount = 0;
  let prevMatchIdx = -2;

  for (let i = 0; i < matchedIndices.length; i++) {
    const matchIdx = matchedIndices[i];

    score += SCORE_CHARACTER_MATCH;

    if (i === 0 && matchIdx === 0) {
      score += SCORE_FIRST_CHAR_BONUS;
    }

    if (isWordBoundary(target, matchIdx)) {
      score += SCORE_WORD_BOUNDARY;
    }

    if (isCamelCaseBoundary(original, matchIdx)) {
      score += SCORE_CAMEL_CASE_MATCH;
    }

    if (matchIdx === prevMatchIdx + 1) {
      consecutiveCount++;
      score += SCORE_CONSECUTIVE_BONUS * consecutiveCount;
    } else {
      consecutiveCount = 0;
      if (i > 0) {
        const gap = matchIdx - prevMatchIdx - 1;
        score += SCORE_GAP_PENALTY * Math.min(gap, 5);
      }
    }

    prevMatchIdx = matchIdx;
  }

  score += Math.max(0, 20 - (targetLen - searchLen));

  return { score, matchedIndices };
}

/**
 * Rank and filter items based on fuzzy search
 *
 * @param items - Array of searchable items
 * @param searchTerm - The search query
 * @param minScore - Minimum score threshold (default: 0)
 * @returns Sorted array of matched items with scores
 */
export function fuzzySearchItems(
  items: SearchableItem[],
  searchTerm: string,
  minScore: number = 0,
): FuzzyMatch[] {
  const lowerSearch = searchTerm.toLowerCase();
  const matches: FuzzyMatch[] = [];

  for (const item of items) {
    const nameMatch = fuzzyMatch(
      lowerSearch,
      item.name.toLowerCase(),
      item.name,
    );
    const detailsMatch = fuzzyMatch(
      lowerSearch,
      item.details.toLowerCase(),
      item.details,
    );
    const keyMatch = fuzzyMatch(lowerSearch, item.key.toLowerCase(), item.key);

    let bestMatch: { score: number; matchedIndices: number[] } | null = null;

    if (nameMatch && (!bestMatch || nameMatch.score > bestMatch.score)) {
      bestMatch = {
        score: nameMatch.score + 20,
        matchedIndices: nameMatch.matchedIndices,
      };
    }

    if (detailsMatch && (!bestMatch || detailsMatch.score > bestMatch.score)) {
      bestMatch = detailsMatch;
    }

    if (keyMatch && (!bestMatch || keyMatch.score > bestMatch.score)) {
      bestMatch = keyMatch;
    }

    if (bestMatch && bestMatch.score >= minScore) {
      matches.push({
        item: item.element,
        score: bestMatch.score,
        matchedIndices: bestMatch.matchedIndices,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Extract searchable items from TBA event dropdown elements
 */
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

/**
 * Extract searchable items from TBA team dropdown elements
 */
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
