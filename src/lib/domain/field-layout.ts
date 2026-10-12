import type { MatchPacket } from "$lib/native/types";

import { isObject } from "./json";
import type { StationKey } from "./stations";

export interface FieldPoint { readonly x: number; readonly y: number }
export interface FieldLayout {
  /** Where each Station's Bumper Sprite starts in a new Match. */
  readonly defaults: Readonly<Record<StationKey, FieldPoint>>;
  /** Where each Station's team number is drawn along its alliance wall. */
  readonly labels: Readonly<Record<StationKey, FieldPoint>>;
}

const LAYOUT_2025: FieldLayout = {
  defaults: {
    redOne: { x: 2055, y: 455 }, redTwo: { x: 2055, y: 805 }, redThree: { x: 2055, y: 1155 },
    blueOne: { x: 1455, y: 455 }, blueTwo: { x: 1455, y: 805 }, blueThree: { x: 1455, y: 1155 },
  },
  labels: {
    redOne: { x: 3575, y: 455 }, redTwo: { x: 3575, y: 805 }, redThree: { x: 3575, y: 1155 },
    blueOne: { x: -65, y: 455 }, blueTwo: { x: -65, y: 805 }, blueThree: { x: -65, y: 1155 },
  },
};

// label heights are the driver station centers from the official 2026 field drawings
// mapped onto the stretched 2026 artwork - blue DS1 is by the depot at the top and red DS1 mirrors it at the bottom
const LAYOUT_2026: FieldLayout = {
  defaults: {
    redOne: { x: 2680, y: 1405 }, redTwo: { x: 2680, y: 805 }, redThree: { x: 2680, y: 205 },
    blueOne: { x: 830, y: 205 }, blueTwo: { x: 830, y: 805 }, blueThree: { x: 830, y: 1405 },
  },
  labels: {
    redOne: { x: 3575, y: 1337 }, redTwo: { x: 3575, y: 1022 }, redThree: { x: 3575, y: 486 },
    blueOne: { x: -65, y: 273 }, blueTwo: { x: -65, y: 588 }, blueThree: { x: -65, y: 1124 },
  },
};

/** The field a Match is drawn on: its chosen field year, else its TBA year, else the newest field. */
export function matchFieldYear(packet: MatchPacket): number {
  const metadata = packet[12];
  const selected = isObject(metadata) && typeof metadata.selectedFieldYear === "number" ? metadata.selectedFieldYear : null;
  const requested = selected || (typeof packet[11] === "number" ? packet[11] : null);
  return requested && requested < 2026 ? 2025 : 2026;
}

/** Falsy years mean the newest field, matching the native runtime's year selection. */
export function fieldLayout(year?: number | null): FieldLayout {
  return year && year < 2026 ? LAYOUT_2025 : LAYOUT_2026;
}
