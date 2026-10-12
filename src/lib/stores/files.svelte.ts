import { BoardFileError, encodeBackup, encodeBoardConfigFile, readBoardFile, type BoardFile } from "$lib/domain";
import { shareBoardFile, type SaveFileResult } from "$lib/features/files";

import { app } from "./app.svelte";
import { boardConfig } from "./config.svelte";
import { scheduleSync } from "./sync.svelte";
import { toast } from "./toast.svelte";

export type ReplacingFile = Exclude<BoardFile, { kind: "match" }>;

let pending = $state.raw<ReplacingFile | null>(null);

export const boardFiles = {
  get pending(): ReplacingFile | null { return pending; },

  // a match file is added at once - a file that would replace data waits for confirm()
  async open(file: File): Promise<string | null> {
    const boardFile = readBoardFile(await file.text());
    if (boardFile.kind !== "match") {
      pending = boardFile;
      return null;
    }
    await app.importPackets([boardFile.packet]);
    return `Imported "${boardFile.packet[0] || "Untitled match"}" as a what-if match.`;
  },

  async openPicked(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    input.value = "";
    if (!chosen) return;
    try {
      const message = await this.open(chosen);
      if (message) toast.show(message, "info", 3500);
    } catch (error) {
      toast.show(error instanceof BoardFileError ? error.message : "Could not open that file.", "error");
    }
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
