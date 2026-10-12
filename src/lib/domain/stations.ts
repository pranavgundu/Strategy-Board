export const OUR_TEAM = "1690";

export function teamNumberKey(team: string): string | null {
  const trimmed = team.trim();
  return /^\d{1,5}$/.test(trimmed) && Number(trimmed) > 0 ? String(Number(trimmed)) : null;
}

export const STATIONS = ["redOne", "redTwo", "redThree", "blueOne", "blueTwo", "blueThree"] as const;
export type StationKey = (typeof STATIONS)[number];
export type AllianceColor = "red" | "blue";

export const ALLIANCE_STATIONS: Readonly<Record<AllianceColor, readonly StationKey[]>> = { red: ["redOne", "redTwo", "redThree"], blue: ["blueOne", "blueTwo", "blueThree"] };
export const STATION_NAMES: Readonly<Record<StationKey, string>> = { redOne: "Red 1", redTwo: "Red 2", redThree: "Red 3", blueOne: "Blue 1", blueTwo: "Blue 2", blueThree: "Blue 3" };

export function stationAlliance(station: StationKey): AllianceColor {
  return station.startsWith("red") ? "red" : "blue";
}
