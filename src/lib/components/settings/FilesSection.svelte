<script lang="ts">
  import { boardFiles } from "$lib/stores/files.svelte";
  import { toast } from "$lib/stores/toast.svelte";

  let input = $state<HTMLInputElement>();

  async function save(create: () => Promise<{ saved: boolean }>, done: string) {
    try {
      if ((await create()).saved) toast.show(done, "info", 3500);
    } catch {
      toast.show("Could not save that file.", "error");
    }
  }

</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap items-center gap-3">
    <button id="files-export-config-btn" class="flex items-center gap-2 px-5 py-3 btn-secondary" onclick={() => save(() => boardFiles.exportBoardConfig(), "Board Config saved.")}>
      <i class="fas fa-file-export"></i> Export Board Config
    </button>
    <button id="files-backup-btn" class="flex items-center gap-2 px-5 py-3 btn-secondary" onclick={() => save(() => boardFiles.createBackup(), "Backup saved.")}>
      <i class="fas fa-box-archive"></i> Create Backup
    </button>
    <button id="files-import-btn" class="flex items-center gap-2 px-5 py-3 btn-secondary" onclick={() => input?.click()}>
      <i class="fas fa-file-import"></i> Import Board Config or restore Backup…
    </button>
    <input bind:this={input} id="files-import-input" type="file" accept=".txt,.json,text/plain,application/json" class="hidden" onchange={(event) => boardFiles.openPicked(event.currentTarget)} />
  </div>
  <p class="text-sm text-[#999]">
    The Board Config holds the Checklist, Team Color overrides, and Common Paths. A Backup holds every Match plus the Board Config, the event key, and deleted matches, for setting up a replacement tablet. Importing either replaces what is on this tablet after you confirm.
  </p>
</div>
