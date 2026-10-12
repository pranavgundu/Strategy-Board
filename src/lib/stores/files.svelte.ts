import { encodeBackup, encodeBoardConfigFile, readBoardFile, type BoardFile } from "$lib/domain";
import { shareBoardFile, type SaveFileResult } from "$lib/features/files";

import { app } from "./app.svelte";
import { boardConfig } from "./config.svelte";
import { scheduleSync } from "./sync.svelte";

export type ReplacingFile = Exclude<BoardFile, { kind: "match" }>;

let pending = $state.raw<ReplacingFile | null>(null);

/** Saving and opening the files the board makes: Match Files, the Board Config, and Backups. */
export const boardFiles = {
  /** A Board Config or Backup waiting for confirmation before it replaces this tablet's data. */
  get pending(): ReplacingFile | null { return pending; },

  /** A Match File is added at once as a What-if Match; a file that would replace data waits for confirm(). */
  async open(file: File): Promise<string | null> {
    const read = readBoardFile(await file.text());
    if (read.kind !== "match") {
      pending = read;
      return null;
    }
    await app.importPackets([read.packet]);
    return `Imported "${read.packet[0] || "Untitled match"}" as a what-if match.`;
  },

  cancel(): void {
    pending = null;
  },

  async confirm(): Promise<string> {
    const file = pending;
    pending = null;
    if (!file) return "";
    if (file.kind === "board-config") {
      await boardConfig.update(file.config);
      return "Board Config imported.";
    }
    await app.replaceAll(file.backup.packets);
    await boardConfig.update(file.backup.config);
    await scheduleSync.restoreState(file.backup);
    return `Backup restored with ${file.backup.packets.length} match${file.backup.packets.length === 1 ? "" : "es"}.`;
  },

  exportBoardConfig(): Promise<SaveFileResult> {
    return shareBoardFile(encodeBoardConfigFile(boardConfig.current), { filename: "orbit-board-config", title: "Orbit Board Config" });
  },

  createBackup(): Promise<SaveFileResult> {
    const backup = { packets: [...app.packets], config: boardConfig.current, manualEventKey: scheduleSync.manualEventKey, dismissed: scheduleSync.dismissed };
    return shareBoardFile(encodeBackup(backup), { filename: `orbit-backup-${new Date().toISOString().slice(0, 10)}`, title: "Orbit Strategy Board backup" });
  },
};
