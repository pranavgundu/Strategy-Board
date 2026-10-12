import { describe, expect, it } from "vitest";

import { inkStation, NEUTRAL_INK, newMatchPacket, reassignStations, STATIONS, teamInk, type Lineup, type StationKey } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";
import { strokeBounds } from "$lib/whiteboard/geometry";

const PHASES = [1, 2, 3, 4, 5];
type Pose = number[];
type Points = number[][];

/** Every Station gets a distinct sprite pose and one Stroke in every Phase, plus one Neutral Stroke. */
function plannedMatch(red: [string, string, string], blue: [string, string, string]): MatchPacket {
  const packet = newMatchPacket({ matchName: "Quals 9", redTeams: red, blueTeams: blue, tbaYear: 2026 }, "match");
  const body = packet[8] as unknown[][];
  body[0] = STATIONS.map((_, index) => [150 + index, 150 + index]);
  for (const phase of PHASES) {
    const strokes = STATIONS.map((station, index) => [teamInk(station), [100 * index + phase, 10], [100 * index + phase, 90]]);
    strokes.push([NEUTRAL_INK, [5, 5], [6, phase]]);
    body[phase] = [
      ...STATIONS.map((_, index) => [1000 + 100 * index + phase, 500 + 10 * index + phase, 0.25 * index]),
      strokes,
      strokes.map((stroke) => strokeBounds(stroke as [number, [number, number]])),
      [],
    ];
  }
  return packet;
}

function stationOf(packet: MatchPacket, team: string): StationKey {
  const index = packet.slice(1, 7).indexOf(team);
  if (index < 0) throw new Error(`${team} is not in the match`);
  return STATIONS[index];
}

/** Everything a Station holds: its sprite pose and size and its Team Ink Strokes, in every Phase. */
function contentAt(packet: MatchPacket, station: StationKey): { size: unknown; poses: Pose[]; strokes: Points[][] } {
  const index = STATIONS.indexOf(station);
  const body = packet[8] as unknown[][];
  return {
    size: (body[0] as unknown[])[index],
    poses: PHASES.map((phase) => body[phase][index] as Pose),
    strokes: PHASES.map((phase) => (body[phase][6] as unknown[][]).filter((stroke) => inkStation(stroke[0] as number) === station).map((stroke) => stroke.slice(1) as Points)),
  };
}

const contentOf = (packet: MatchPacket, team: string) => contentAt(packet, stationOf(packet, team));

function lineup(red: [string, string, string], blue: [string, string, string]): Lineup {
  return { redOne: red[0], redTwo: red[1], redThree: red[2], blueOne: blue[0], blueTwo: blue[1], blueThree: blue[2] };
}

describe("Station reassignment", () => {
  it("moves each team's Strokes and Bumper Sprite with it in every Phase when only the Station order changes", () => {
    const before = plannedMatch(["1690", "2231", "11480"], ["4590", "1577", "2679"]);

    const after = reassignStations(before, lineup(["11480", "2231", "1690"], ["1577", "2679", "4590"]));

    expect(after.slice(1, 7)).toEqual(["11480", "2231", "1690", "1577", "2679", "4590"]);
    for (const team of ["1690", "2231", "11480", "4590", "1577", "2679"]) expect(contentOf(after, team)).toEqual(contentOf(before, team));
  });

  it("hands a replaced team's Strokes and sprite to the team that replaces it", () => {
    const before = plannedMatch(["1690", "2231", "11480"], ["4590", "1577", "2679"]);

    const after = reassignStations(before, lineup(["1690", "2231", "254"], ["4590", "1577", "2679"]));

    expect(contentOf(after, "254")).toEqual(contentOf(before, "11480"));
    for (const team of ["1690", "2231", "4590", "1577", "2679"]) expect(contentOf(after, team)).toEqual(contentOf(before, team));
  });

  it("pairs departing and arriving teams in Station order when a reorder and replacements happen together", () => {
    const before = plannedMatch(["1690", "2231", "11480"], ["4590", "1577", "2679"]);

    const after = reassignStations(before, lineup(["2231", "9999", "1690"], ["7039", "3339", "1577"]));

    expect(contentOf(after, "1690")).toEqual(contentOf(before, "1690"));
    expect(contentOf(after, "2231")).toEqual(contentOf(before, "2231"));
    expect(contentOf(after, "9999")).toEqual(contentOf(before, "11480"));
    expect(contentOf(after, "1577")).toEqual(contentOf(before, "1577"));
    expect(contentOf(after, "7039")).toEqual(contentOf(before, "4590"));
    expect(contentOf(after, "3339")).toEqual(contentOf(before, "2679"));
  });

  it("keeps a removed team's content in its now empty Station until a team arrives there", () => {
    const before = plannedMatch(["1690", "2231", "11480"], ["4590", "1577", "2679"]);

    const emptied = reassignStations(before, lineup(["1690", "", "11480"], ["4590", "1577", "2679"]));
    const refilled = reassignStations(emptied, lineup(["1690", "5635", "11480"], ["4590", "1577", "2679"]));

    expect(emptied.slice(1, 4)).toEqual(["1690", "", "11480"]);
    expect(contentAt(emptied, "redTwo")).toEqual(contentAt(before, "redTwo"));
    expect(contentOf(refilled, "5635")).toEqual(contentOf(before, "2231"));
  });

  it("leaves Neutral Ink where it is", () => {
    const before = plannedMatch(["1690", "2231", "11480"], ["4590", "1577", "2679"]);
    const neutral = (packet: MatchPacket) => PHASES.map((phase) => ((packet[8] as unknown[][])[phase][6] as unknown[][]).filter((stroke) => stroke[0] === NEUTRAL_INK));

    const after = reassignStations(before, lineup(["254", "1690", ""], ["1577", "4590", "2679"]));

    expect(neutral(after)).toEqual(neutral(before));
  });

  it("keeps content no Station of its alliance can take as Neutral Strokes, and starts an unmatched arrival fresh", () => {
    const before = plannedMatch(["1690", "2231", "11480"], ["4590", "1577", "2679"]);

    const after = reassignStations(before, lineup(["4590", "2231", "11480"], ["254", "1577", "2679"]));

    expect(contentOf(after, "4590")).toEqual(contentOf(before, "4590"));
    const neutralPoints = PHASES.map((phase) => ((after[8] as unknown[][])[phase][6] as unknown[][]).filter((stroke) => stroke[0] === NEUTRAL_INK).map((stroke) => stroke.slice(1)));
    contentOf(before, "1690").strokes.forEach((strokes, phase) => expect(neutralPoints[phase]).toEqual(expect.arrayContaining(strokes)));
    expect(contentOf(after, "254").strokes).toEqual(PHASES.map(() => []));
    expect(contentOf(after, "254").poses).toEqual(PHASES.map(() => [830, 205, 0]));
  });
});
