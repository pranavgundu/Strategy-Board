export const OUR_TEAM = "1690";

export const STATIONS = ["redOne", "redTwo", "redThree", "blueOne", "blueTwo", "blueThree"] as const;
export type StationKey = (typeof STATIONS)[number];
