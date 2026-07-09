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

const FIELD_IMAGES: FieldImageMap = {
  2025: field2025,
  2026: field2026,
};

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
      one: { x: 2680, y: 205 },
      two: { x: 2680, y: 805 },
      three: { x: 2680, y: 1405 },
    },
    blue: {
      one: { x: 830, y: 205 },
      two: { x: 830, y: 805 },
      three: { x: 830, y: 1405 },
    },
  },
};

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

function getAvailableYears(): number[] {
  return Object.keys(FIELD_IMAGES)
    .map(Number)
    .sort((a, b) => a - b);
}

export function getLatestFieldYear(): number {
  const years = getAvailableYears();
  return years[years.length - 1];
}

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

export function getYearFromFieldImage(imageUrl: string): number | undefined {
  for (const [year, url] of Object.entries(FIELD_IMAGES)) {
    if (url === imageUrl) {
      return Number(year);
    }
  }
  return undefined;
}

export function hasFieldForYear(year: number): boolean {
  return FIELD_IMAGES[year] !== undefined;
}

export function getAvailableFieldYears(): string[] {
  return getAvailableYears().map(String);
}

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
  } catch (error) {
    console.warn("[FieldManager] Some field images failed to preload:", error);
  }
}

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
