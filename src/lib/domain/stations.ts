export const OUR_TEAM = "1690";

/** A team number as the board stores it, or null when the text isn't one. */
export function teamNumberKey(team: string): string | null {
  const trimmed = team.trim();
  return /^\d{1,5}$/.test(trimmed) && Number(trimmed) > 0 ? String(Number(trimmed)) : null;
}

export const STATIONS = ["redOne", "redTwo", "redThree", "blueOne", "blueTwo", "blueThree"] as const;
export type StationKey = (typeof STATIONS)[number];
export type AllianceColor = "red" | "blue";

export function stationAlliance(station: StationKey): AllianceColor {
  return station.startsWith("red") ? "red" : "blue";
}
