import { describe, expect, it } from "vitest";

import { pickCurrentEvent } from "$lib/domain";

import isde1 from "./fixtures/nexus-2026isde1.json";
import cacgEmpty from "./fixtures/nexus-2026cacg-empty.json";
import nexusEvents from "./fixtures/nexus-events-2026-10.json";
import tbaEvents from "./fixtures/tba-1690-events-2026.json";

const at = (iso: string) => Date.parse(iso);
// the October list no longer has the June district event, so it is added back with its real dates
const withIsde1 = { ...nexusEvents, "2026isde1": { name: "ISR District Event #1", start: at("2026-06-28T05:00:00Z"), end: at("2026-06-29T16:00:00Z") } };

describe("Current Event detection", () => {
  it("picks the Nexus event running today whose schedule includes 1690", () => {
    const event = pickCurrentEvent({ manualEventKey: null, nexusEvents: withIsde1, nexusSchedules: { "2026isde1": isde1 }, tbaEvents, now: at("2026-06-28T09:00:00Z") });

    expect(event).toMatchObject({ eventKey: "2026isde1", name: "ISR District Event #1", source: "nexus" });
  });

  it("finds nothing on a day without a 1690 event, so sync waits for a schedule", () => {
    expect(pickCurrentEvent({ manualEventKey: null, nexusEvents, nexusSchedules: {}, tbaEvents, now: at("2026-10-12T12:00:00Z") })).toBeNull();
  });

  it("skips running events whose schedule doesn't include 1690", () => {
    const withoutUs = JSON.parse(JSON.stringify(isde1).replaceAll('"1690"', '"9999"'));

    const event = pickCurrentEvent({
      manualEventKey: null,
      nexusEvents,
      nexusSchedules: { "2026cacg": cacgEmpty, "2026mexas": { ...withoutUs, eventKey: "2026mexas" } },
      tbaEvents,
      now: at("2026-10-16T18:00:00Z"),
    });

    expect(event).toBeNull();
  });

  it("falls back to the TBA event 1690 is at when no Nexus event lists 1690", () => {
    const event = pickCurrentEvent({ manualEventKey: null, nexusEvents, nexusSchedules: {}, tbaEvents, now: at("2026-07-07T08:00:00Z") });

    expect(event).toMatchObject({ eventKey: "2026iscmp", name: "FIRST Israel District Championship", source: "tba" });
  });

  it("allows a day of slack around the event dates", () => {
    expect(pickCurrentEvent({ manualEventKey: null, nexusEvents, nexusSchedules: {}, tbaEvents, now: at("2026-07-05T10:00:00Z") })?.eventKey).toBe("2026iscmp");
    expect(pickCurrentEvent({ manualEventKey: null, nexusEvents, nexusSchedules: {}, tbaEvents, now: at("2026-07-11T10:00:00Z") })).toBeNull();
  });

  it("lets a hand-entered event key override detection", () => {
    const event = pickCurrentEvent({ manualEventKey: "2026isrtp", nexusEvents: withIsde1, nexusSchedules: { "2026isde1": isde1 }, tbaEvents, now: at("2026-06-28T09:00:00Z") });

    expect(event).toMatchObject({ eventKey: "2026isrtp", source: "manual" });
  });
});
