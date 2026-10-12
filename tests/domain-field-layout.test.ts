import { describe, expect, it } from "vitest";

import { fieldLayout } from "$lib/domain";
import { createBrowserMatchPacket, normalizeBrowserMatchPacket } from "$lib/native/web";

function autoPoses(year: number): number[][] {
  const packet = createBrowserMatchPacket({ matchName: "Quals 1", redTeams: ["1", "2", "3"], blueTeams: ["4", "5", "6"], tbaYear: year }, "id");
  return (packet[8][1] as number[][]).slice(0, 6);
}

describe("2026 station layout", () => {
  it("reads red 3, 2, 1 and blue 1, 2, 3 from the top of each wall at the real driver station positions", () => {
    const { labels } = fieldLayout(2026);

    expect([labels.redThree.y, labels.redTwo.y, labels.redOne.y]).toEqual([486, 1022, 1337]);
    expect([labels.blueOne.y, labels.blueTwo.y, labels.blueThree.y]).toEqual([273, 588, 1124]);
  });

  it("starts each Bumper Sprite of a new 2026 Match on its own station's side", () => {
    expect(autoPoses(2026)).toEqual([
      [2680, 1405, 0], [2680, 805, 0], [2680, 205, 0],
      [830, 205, 0], [830, 805, 0], [830, 1405, 0],
    ]);
  });

  it("keeps the stored sprite positions of a Match saved before the fix", () => {
    const saved = createBrowserMatchPacket({ matchName: "Quals 4", redTeams: ["1", "2", "3"], blueTeams: ["4", "5", "6"], tbaYear: 2026 }, "saved");
    (saved[8][1] as number[][])[0] = [2680, 205, 0];
    (saved[8][1] as number[][])[2] = [2680, 1405, 0];

    const loaded = normalizeBrowserMatchPacket(structuredClone(saved));

    expect((loaded[8][1] as number[][]).slice(0, 3)).toEqual([[2680, 205, 0], [2680, 805, 0], [2680, 1405, 0]]);
  });

  it("leaves the 2025 field's labels and defaults unchanged", () => {
    const { labels } = fieldLayout(2025);

    expect(autoPoses(2025)).toEqual([
      [2055, 455, 0], [2055, 805, 0], [2055, 1155, 0],
      [1455, 455, 0], [1455, 805, 0], [1455, 1155, 0],
    ]);
    expect([labels.redOne.y, labels.redTwo.y, labels.redThree.y, labels.blueOne.y, labels.blueTwo.y, labels.blueThree.y]).toEqual([455, 805, 1155, 455, 805, 1155]);
  });
});
