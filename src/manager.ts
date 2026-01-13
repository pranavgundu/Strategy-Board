/**
 * Field Manager - Dynamically manages field images based on year
 *
 * This module handles the selection of field images based on the match year:
 * - For new matches (no year specified), uses the latest available field
 * - For TBA/historical matches, uses the field from that specific year
 */

import field2025 from "./images/2025.png";
import field2026 from "./images/2026.png";

interface FieldImageMap {
  [year: number]: string;
}

interface RobotPositions {
  red: {
    one: { x: number; y: number };
    two: { x: number; y: number };
    three: { x: number; y: number };
  };
  blue: {
    one: { x: number; y: number };
    two: { x: number; y: number };
    three: { x: number; y: number };
  };
}

interface YearConfig {
  [year: number]: RobotPositions;
}

/**
 * Map of available field images by year
 * Add new years here as new field images are added to the images directory
 */
const FIELD_IMAGES: FieldImageMap = {
  2025: field2025,
  2026: field2026,
};

/**
 * Default robot starting positions for each year
 * Customize these based on each year's game starting positions
 */
const YEAR_ROBOT_POSITIONS: YearConfig = {
  2025: {
    red: {
      one: { x: 2055, y: 455 },
      two: { x: 2055, y: 805 },
      three: { x: 2055, y: 1155 },
    },
    blue: {
      one: { x: 1455, y: 455 },
      two: { x: 1455, y: 805 },
      three: { x: 1455, y: 1155 },
    },
  },
  2026: {
    red: {
      one: { x: 2055, y: 455 },
      two: { x: 2055, y: 805 },
      three: { x: 2055, y: 1155 },
    },
    blue: {
      one: { x: 1455, y: 455 },
      two: { x: 1455, y: 805 },
      three: { x: 1455, y: 1155 },
    },
  },
};

/**
 * Fallback default positions if year not found
 */
const FALLBACK_POSITIONS: RobotPositions = {
  red: {
    one: { x: 2055, y: 455 },
    two: { x: 2055, y: 805 },
    three: { x: 2055, y: 1155 },
  },
  blue: {
    one: { x: 1455, y: 455 },
    two: { x: 1455, y: 805 },
    three: { x: 1455, y: 1155 },
  },
};

/**
 * Gets all available field years sorted in ascending order.
 *
 * @returns An array of years (as numbers) sorted from earliest to latest
 */
function getAvailableYears(): number[] {
  return Object.keys(FIELD_IMAGES)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Gets the latest (most recent) available field year.
 *
 * @returns The most recent year for which a field image is available
 */
export function getLatestFieldYear(): number {
  const years = getAvailableYears();
  return years[years.length - 1];
}

/**
 * Gets the field image URL for a specific year.
 * Falls back to the closest available year if exact match not found.
 *
 * @param year - The year to get the field image for. If not provided, uses the latest available year.
 * @returns The field image URL for the requested or closest available year
 */
export function getFieldImageForYear(year?: number): string {
  if (!year) {
    const latestYear = getLatestFieldYear();
    return FIELD_IMAGES[latestYear];
  }

  if (FIELD_IMAGES[year]) {
    return FIELD_IMAGES[year];
  }

  const availableYears = getAvailableYears();

  if (year < availableYears[0]) {
    return FIELD_IMAGES[availableYears[0]];
  }

  if (year > availableYears[availableYears.length - 1]) {
    return FIELD_IMAGES[availableYears[availableYears.length - 1]];
  }

  let closestYear = availableYears[0];
  for (const availYear of availableYears) {
    if (availYear <= year) {
      closestYear = availYear;
    } else {
      break;
    }
  }

  return FIELD_IMAGES[closestYear];
}

/**
 * Gets the year associated with a field image URL.
 *
 * @param imageUrl - The field image URL to look up
 * @returns The year associated with the image URL, or undefined if not found
 */
export function getYearFromFieldImage(imageUrl: string): number | undefined {
  for (const [year, url] of Object.entries(FIELD_IMAGES)) {
    if (url === imageUrl) {
      return Number(year);
    }
  }
  return undefined;
}

/**
 * Checks if a field image exists for a specific year.
 *
 * @param year - The year to check for field image availability
 * @returns True if a field image exists for that year, false otherwise
 */
export function hasFieldForYear(year: number): boolean {
  return FIELD_IMAGES[year] !== undefined;
}

/**
 * Gets all available field years as a formatted list.
 * Useful for UI display.
 *
 * @returns Array of year strings sorted from earliest to latest
 */
export function getAvailableFieldYears(): string[] {
  return getAvailableYears().map(String);
}

/**
 * Preloads field images to ensure they're cached.
 * Call this during app initialization for better performance.
 *
 * @returns A Promise that resolves when all images are loaded successfully
 * @throws Logs a warning if some images fail to preload, but does not reject
 */
export async function preloadFieldImages(): Promise<void> {
  const loadPromises = Object.values(FIELD_IMAGES).map((url) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error(`Failed to load field image: ${url}`));
      img.src = url;
    });
  });

  try {
    await Promise.all(loadPromises);
    console.log(`[FieldManager] Preloaded ${loadPromises.length} field images`);
  } catch (error) {
    console.warn("[FieldManager] Some field images failed to preload:", error);
  }
}

/**
 * Gets the default robot starting positions for a specific year.
 * Falls back to the closest available year's positions if exact match not found.
 *
 * @param year - The year to get positions for. If not provided, uses the latest available year.
 * @returns Robot starting positions for red and blue alliances with x, y coordinates for all six robots
 */
export function getRobotPositionsForYear(year?: number): RobotPositions {
  if (!year) {
    const latestYear = getLatestFieldYear();
    return YEAR_ROBOT_POSITIONS[latestYear] || FALLBACK_POSITIONS;
  }

  if (YEAR_ROBOT_POSITIONS[year]) {
    return YEAR_ROBOT_POSITIONS[year];
  }

  const availableYears = Object.keys(YEAR_ROBOT_POSITIONS)
    .map(Number)
    .sort((a, b) => a - b);

  if (availableYears.length === 0) {
    return FALLBACK_POSITIONS;
  }

  if (year < availableYears[0]) {
    return YEAR_ROBOT_POSITIONS[availableYears[0]];
  }

  if (year > availableYears[availableYears.length - 1]) {
    return YEAR_ROBOT_POSITIONS[availableYears[availableYears.length - 1]];
  }

  let closestYear = availableYears[0];
  for (const availYear of availableYears) {
    if (availYear <= year) {
      closestYear = availYear;
    } else {
      break;
    }
  }

  return YEAR_ROBOT_POSITIONS[closestYear] || FALLBACK_POSITIONS;
}
