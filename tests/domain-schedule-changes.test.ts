import { describe, expect, it } from "vitest";

import { inkStation, packetLineup, parseNexusEvent, planSync, readExtras, reassignStations, STATIONS, swapBenchTeam, teamInk } from "$lib/domain";
import type { MatchPacket } from "$lib/native/types";

import isde1 from "./fixtures/nexus-2026isde1.json";

type NexusMatch = { label: string; redTeams: string[] | null; blueTeams: string[] | null };
let ids = 0;
const newId = () => `synced-${++ids}`;

function schedule(edit: (matches: NexusMatch[]) => void = () => undefined) {
  const copy = structuredClone(isde1) as { matches: NexusMatch[] };
  edit(copy.matches);
  return parseNexusEvent(copy)!;
}
const byLabel = (matches: NexusMatch[], label: string) => matches.find((match) => match.label === label)!;
const named = (packets: readonly MatchPacket[], name: string) => packets.find((packet) => packet[0] === name)!;

// every occupied station gets one auto stroke and a distinct pose so moves are visible
function planned(packet: MatchPacket): MatchPacket {
  const copy = structuredClone(packet);
  const auto = (copy[8] as unknown[][])[1];
  STATIONS.forEach((station, index) => { auto[index] = [100 + index, 200 + index, 0]; });
  auto[6] = STATIONS.map((station, index) => [teamInk(station), [index, index], [index + 1, index + 1]]);
  auto[7] = STATIONS.map((_, index) => [index, index, index + 1, index + 1]);
  return copy;
}

function planOf(packet: MatchPacket, team: string) {
  const station = STATIONS[packet.slice(1, 7).indexOf(team)];
  const auto = (packet[8] as unknown[][])[1];
  return { pose: auto[STATIONS.indexOf(station)], strokes: (auto[6] as unknown[][]).filter((stroke) => inkStation(stroke[0] as number) === station).map((stroke) => stroke.slice(1)) };
}

function synced(edit?: (matches: NexusMatch[]) => void): MatchPacket[] {
  return planSync({ packets: [], schedule: schedule(edit), newId }).add.map(planned);
}

describe("Schedule team changes", () => {
  it("leave hand-edited Stations alone until the schedule reports something new", () => {
    const board = synced();
    const quals2 = named(board, "Quals 2");
    const handEdited = reassignStations(quals2, { ...packetLineup(quals2), blueOne: "7039", blueTwo: "1690" });
    const edited = board.map((packet) => (packet === quals2 ? handEdited : packet));

    expect(planSync({ packets: edited, schedule: schedule(), newId }).update).toEqual([]);

    const replaced = planSync({ packets: edited, schedule: schedule((matches) => { byLabel(matches, "Qualification 2").blueTeams = ["1690", "7039", "254"]; }), newId }).update;
    expect(replaced).toHaveLength(1);
    expect(replaced[0].slice(1, 7)).toEqual(["9740", "9738", "1574", "1690", "7039", "254"]);
    expect(planOf(replaced[0], "254")).toEqual(planOf(handEdited, "2231"));
    expect(planOf(replaced[0], "1690")).toEqual(planOf(handEdited, "1690"));
    expect(readExtras(replaced[0]).sync?.blue).toEqual(["1690", "7039", "254"]);
  });

  it("keep a strategist's provisional playoff lineup, then move every plan with its team when the final lineup arrives", () => {
    const board = synced();
    const playoff7 = named(board, "Playoff 7");
    const provisional = reassignStations(playoff7, { ...packetLineup(playoff7), redOne: "2231", redTwo: "1690" });
    const edited = board.map((packet) => (packet === playoff7 ? provisional : packet));

    expect(planSync({ packets: edited, schedule: schedule(), newId }).update).toEqual([]);

    const [final] = planSync({ packets: edited, schedule: schedule((matches) => { byLabel(matches, "Playoff 7").redTeams = ["11480", "2231", "1690"]; }), newId }).update;
    expect(final.slice(1, 4)).toEqual(["11480", "2231", "1690"]);
    for (const team of ["1690", "2231", "11480"]) expect(planOf(final, team)).toEqual(planOf(provisional, team));
  });

  it("record an alliance's fourth team as its Bench Team, and sync matches where 1690 is benched", () => {
    const board = synced((matches) => {
      byLabel(matches, "Playoff 7").redTeams = ["1690", "2231", "11480", "9740"];
      byLabel(matches, "Playoff 6").redTeams = ["9303", "3065", "9740", "1690"];
    });

    expect(named(board, "Playoff 7").slice(1, 4)).toEqual(["1690", "2231", "11480"]);
    expect(readExtras(named(board, "Playoff 7")).bench).toEqual({ red: "9740" });
    expect(named(board, "Playoff 6").slice(1, 4)).toEqual(["9303", "3065", "9740"]);
    expect(readExtras(named(board, "Playoff 6")).bench).toEqual({ red: "1690" });
  });

  it("swap a Bench Team into a Station, handing it that Station's plan and benching the displaced team", () => {
    const board = synced((matches) => { byLabel(matches, "Playoff 7").redTeams = ["1690", "2231", "11480", "9740"]; });
    const before = named(board, "Playoff 7");

    const after = swapBenchTeam(before, "redThree");

    expect(after.slice(1, 4)).toEqual(["1690", "2231", "9740"]);
    expect(readExtras(after).bench).toEqual({ red: "11480" });
    expect(planOf(after, "9740")).toEqual(planOf(before, "11480"));
    expect(readExtras(after).sync).toEqual(readExtras(before).sync);
  });

  it("leave Stations empty for a short list and never shift the listed teams", () => {
    const board = synced();
    const quals13 = named(board, "Quals 13");

    const [shortened] = planSync({ packets: board, schedule: schedule((matches) => { byLabel(matches, "Qualification 13").blueTeams = ["1574", "1690"]; }), newId }).update;

    expect(shortened.slice(4, 7)).toEqual(["1574", "", "1690"]);
    expect(planOf(shortened, "1690")).toEqual(planOf(quals13, "1690"));
    expect(planOf(shortened, "1574")).toEqual(planOf(quals13, "1574"));
  });
});
