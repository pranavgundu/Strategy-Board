/**
 * Field Manager - Dynamically manages field images based on year
 *
 * This module handles the selection of field images based on the match year:
 * - For new matches (no year specified), uses the latest available field
 * - For TBA/historical matches, uses the field from that specific year
 */

// Import all field images explicitly
// As new years are added, import them here
import field2025 from "./images/2025.png";

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
  // Add future years here:
  // 2026: field2026,
  // 2027: field2027,
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
  // Add future years here with their specific starting positions:
  // 2026: {
  //   red: {
  //     one: { x: 2100, y: 500 },
  //     two: { x: 2100, y: 800 },
  //     three: { x: 2100, y: 1100 },
  //   },
  //   blue: {
  //     one: { x: 1400, y: 500 },
  //     two: { x: 1400, y: 800 },
  //     three: { x: 1400, y: 1100 },
  //   },
  // },
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
 * Gets all available field years sorted in ascending order
 */
function getAvailableYears(): number[] {
  return Object.keys(FIELD_IMAGES)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Gets the latest (most recent) available field year
 */
export function getLatestFieldYear(): number {
  const years = getAvailableYears();
  return years[years.length - 1];
}

/**
 * Gets the field image URL for a specific year
 * Falls back to the closest available year if exact match not found
 *
 * @param year - The year to get the field image for
 * @returns The field image URL
 */
export function getFieldImageForYear(year?: number): string {
  // If no year specified, use the latest field
  if (!year) {
    const latestYear = getLatestFieldYear();
    return FIELD_IMAGES[latestYear];
  }

  // If exact year exists, return it
  if (FIELD_IMAGES[year]) {
    return FIELD_IMAGES[year];
  }

  // Otherwise, find the closest year (prefer earlier year for backward compatibility)
  const availableYears = getAvailableYears();

  // If requested year is before all available years, use the earliest
  if (year < availableYears[0]) {
    return FIELD_IMAGES[availableYears[0]];
  }

  // If requested year is after all available years, use the latest
  if (year > availableYears[availableYears.length - 1]) {
    return FIELD_IMAGES[availableYears[availableYears.length - 1]];
  }

  // Find the closest year (prefer the year before or at the requested year)
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
 * Gets the year associated with a field image URL
 *
 * @param imageUrl - The field image URL
 * @returns The year, or undefined if not found
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
 * Checks if a field image exists for a specific year
 *
 * @param year - The year to check
 * @returns True if a field image exists for that year
 */
export function hasFieldForYear(year: number): boolean {
  return FIELD_IMAGES[year] !== undefined;
}

/**
 * Gets all available field years as a formatted list
 * Useful for UI display
 *
 * @returns Array of year strings
 */
export function getAvailableFieldYears(): string[] {
  return getAvailableYears().map(String);
}

/**
 * Preloads field images to ensure they're cached
 * Call this during app initialization for better performance
 *
 * @returns Promise that resolves when all images are loaded
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
 * Gets the default robot starting positions for a specific year
 * Falls back to latest year's positions if not found
 *
 * @param year - The year to get positions for (optional)
 * @returns Robot starting positions for red and blue alliances
 */
export function getRobotPositionsForYear(year?: number): RobotPositions {
  // If no year specified, use the latest year
  if (!year) {
    const latestYear = getLatestFieldYear();
    return YEAR_ROBOT_POSITIONS[latestYear] || FALLBACK_POSITIONS;
  }

  // If positions exist for this year, return them
  if (YEAR_ROBOT_POSITIONS[year]) {
    return YEAR_ROBOT_POSITIONS[year];
  }

  // Otherwise, find the closest year with positions
  const availableYears = Object.keys(YEAR_ROBOT_POSITIONS)
    .map(Number)
    .sort((a, b) => a - b);

  if (availableYears.length === 0) {
    return FALLBACK_POSITIONS;
  }

  // If requested year is before all available years, use the earliest
  if (year < availableYears[0]) {
    return YEAR_ROBOT_POSITIONS[availableYears[0]];
  }

  // If requested year is after all available years, use the latest
  if (year > availableYears[availableYears.length - 1]) {
    return YEAR_ROBOT_POSITIONS[availableYears[availableYears.length - 1]];
  }

  // Find the closest year (prefer earlier year for backward compatibility)
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
