import type { MatchPacket } from "$lib/native/types";

import { fieldLayout } from "./field-layout";
import { inkStation, NEUTRAL_INK, teamInk, type Lineup } from "./ink";
import { STATIONS, type StationKey } from "./stations";

const ALLIANCES: readonly (readonly StationKey[])[] = [["redOne", "redTwo", "redThree"], ["blueOne", "blueTwo", "blueThree"]];
const ROBOT_SIZE = 152.4;

export function packetLineup(packet: MatchPacket): Lineup {
  return Object.fromEntries(STATIONS.map((station, index) => [station, typeof packet[index + 1] === "string" ? packet[index + 1] : ""])) as unknown as Lineup;
}

/** For each Station after the change, the Station whose content it takes over, or null to start fresh. */
function contentSources(current: Lineup, next: Lineup): Record<StationKey, StationKey | null> {
  const sources: Partial<Record<StationKey, StationKey | null>> = {};
  const claimed = new Set<StationKey>();
  for (const target of STATIONS) {
    const team = next[target].trim();
    const from = team ? STATIONS.find((station) => current[station].trim() === team) : undefined;
    if (from && !claimed.has(from)) {
      sources[target] = from;
      claimed.add(from);
    }
  }
  for (const alliance of ALLIANCES) {
    const open = alliance.filter((station) => !(station in sources));
    const unclaimed = alliance.filter((station) => !claimed.has(station));
    open.forEach((target, index) => { sources[target] = unclaimed[index] ?? null; });
  }
  return sources as Record<StationKey, StationKey | null>;
}

/**
 * Puts a new lineup into a Match without losing anyone's plan: a team keeps its Strokes and Bumper Sprite
 * wherever it moves, arriving teams inherit what the departing teams of their alliance leave in Station order,
 * and a Station left without a team keeps its content until a team arrives.
 */
export function reassignStations(packet: MatchPacket, next: Lineup): MatchPacket {
  const sources = contentSources(packetLineup(packet), next);
  const destinations = new Map<StationKey, StationKey>();
  for (const target of STATIONS) {
    const from = sources[target];
    if (from) destinations.set(from, target);
  }
  const copy = structuredClone(packet);
  STATIONS.forEach((station, index) => { copy[index + 1] = next[station]; });
  const body = copy[8];
  const { defaults } = fieldLayout(typeof packet[11] === "number" ? packet[11] : undefined);
  const sizes = Array.isArray(body[0]) ? body[0] : [];
  body[0] = STATIONS.map((target) => {
    const from = sources[target];
    return (from && sizes[STATIONS.indexOf(from)]) || [ROBOT_SIZE, ROBOT_SIZE];
  });
  for (const phase of body.slice(1)) {
    if (!Array.isArray(phase)) continue;
    const poses = phase.slice(0, 6);
    STATIONS.forEach((target, index) => {
      const from = sources[target];
      phase[index] = (from && poses[STATIONS.indexOf(from)]) || [defaults[target].x, defaults[target].y, 0];
    });
    for (const stroke of Array.isArray(phase[6]) ? phase[6] : []) {
      if (!Array.isArray(stroke) || typeof stroke[0] !== "number") continue;
      const station = inkStation(stroke[0]);
      if (!station) continue;
      const target = destinations.get(station);
      stroke[0] = target ? teamInk(target) : NEUTRAL_INK;
    }
  }
  return copy;
}

