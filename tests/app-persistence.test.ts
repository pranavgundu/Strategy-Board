import { indexedDB } from "fake-indexeddb";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../src/lib/stores/app.svelte";
import { native } from "../src/lib/native/api";
import { whiteboardMatchFromPacket, writeWhiteboardPacket } from "../src/lib/whiteboard/packet";

beforeAll(async () => {
  // Exercise the same browser fallback as Chrome/Safari, not the Tauri bridge.
  vi.stubGlobal("window", {});
  vi.stubGlobal("indexedDB", indexedDB);
  await native.storage.set("legacyIndexedDbMigrationV1", true);
  await app.init();
});
beforeEach(async () => { await app.clearAll(); });
afterAll(() => vi.unstubAllGlobals());

async function createMatch() {
  const id = await app.createBasicMatch("Browser save", ["1", "2", "3"], ["4", "5", "6"]);
  app.openMatch(id);
  return id;
}

describe("browser match persistence with Svelte client state", () => {
  it("can clone the loaded packet without a reactive-proxy DataCloneError", async () => {
    await createMatch();
    const packet = app.activeMatch!.packet;
    expect(() => structuredClone(packet)).not.toThrow();
    expect(structuredClone(packet)).toEqual(packet);
  });

  it("keeps drawings, robot positions, and notes after exiting, reopening, and reading storage", async () => {
    const id = await createMatch();
    const source = app.activeMatch!.packet;
    const scene = whiteboardMatchFromPacket(source);
    scene.auto.drawing.push([3, [400, 400], [500, 500]]);
    scene.auto.drawingBBox.push([400, 400, 500, 500]);
    scene.auto.redOneRobot.x = 1000;
    scene.notes.checkboxes.push([600, 600, 4, true]);
    await app.commitPacket(writeWhiteboardPacket(source, scene));

    app.closeMatch();
    expect(app.openMatch(id)).toBe(true);
    const reopened = whiteboardMatchFromPacket(app.activeMatch!.packet);
    expect(reopened.auto.drawing).toEqual([[3, [400, 400], [500, 500]]]);
    expect(reopened.auto.redOneRobot.x).toBe(1000);
    expect(reopened.notes.checkboxes).toEqual([[600, 600, 4, true]]);

    // A fresh IndexedDB read proves this isn't merely in-memory retention.
    const persisted = (await native.model.loadPackets()).find((packet) => packet[7] === id)!;
    expect(persisted).toEqual(app.activeMatch!.packet);
    expect(whiteboardMatchFromPacket(persisted).auto.drawing).toEqual(reopened.auto.drawing);
  });

  it("captures each save before later canvas changes and serializes pending saves", async () => {
    const id = await createMatch();
    const scene = whiteboardMatchFromPacket(app.activeMatch!.packet);
    scene.auto.drawing.push([1, [100, 100], [200, 200]]);
    scene.auto.drawingBBox.push([100, 100, 200, 200]);
    const packet = writeWhiteboardPacket(app.activeMatch!.packet, scene);
    const saving = app.commitPacket(packet);
    packet[0] = "Changed after enqueue";
    scene.auto.drawing.length = 0;
    app.closeMatch();
    await saving;
    app.openMatch(id);
    expect(app.activeMatch!.matchName).toBe("Browser save");
    expect(whiteboardMatchFromPacket(app.activeMatch!.packet).auto.drawing).toHaveLength(1);
    expect(app.saving).toBe(false);
  });

  it("can duplicate and edit an existing saved match without cloning a proxy", async () => {
    const id = await createMatch();
    const copyId = await app.duplicateMatch(id);
    await app.updateMatch(copyId, {
      matchName: "Edited copy", redOne: "11", redTwo: "12", redThree: "13",
      blueOne: "14", blueTwo: "15", blueThree: "16",
    });
    const persisted = await native.model.loadPackets();
    expect(persisted.find((packet) => packet[7] === copyId)!.slice(0, 7))
      .toEqual(["Edited copy", "11", "12", "13", "14", "15", "16"]);
  });
});
