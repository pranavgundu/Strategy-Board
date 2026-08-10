<script lang="ts">
  let { onNew, onTba, onImportQr, onImportLink, onClear }: { onNew: () => void; onTba: () => void; onImportQr: () => void; onImportLink: () => void; onClear: () => void } = $props();
</script>

<div
  id="home-toolbar"
  class="flex items-center justify-between w-full h-24 bg-[#111111] border-b border-[#1e1e1e] px-10 sm:px-12 md:px-16 pt-[env(safe-area-inset-top)]"
>
  <div
    id="home-toolbar-logo"
    class="text-2xl font-bold text-[#e8e8e8] select-none cursor-pointer tracking-tight"
    onclick={() => location.reload()}
    role="button"
    tabindex="0"
    onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") location.reload(); }}
  >
    Strategy Board
  </div>
  <div class="flex gap-4 items-center">
    <button
      id="home-toolbar-new-btn"
      class="flex items-center justify-center px-10 h-14 btn-secondary text-xl"
      onclick={onNew}
    >
      New
    </button>
    <button
      id="home-toolbar-tba-btn"
      class="flex items-center justify-center gap-2.5 px-10 h-14 btn-secondary text-xl"
      onclick={onTba}
    >
      <span>TBA</span>
      <img src="/tba.svg" alt="TBA" class="h-6 sm:h-7 md:h-9 w-auto" />
    </button>
    <button
      id="home-toolbar-import-btn"
      class="flex items-center justify-center px-10 h-14 btn-secondary text-xl"
      onclick={onImportQr}
    >
      <span class="hidden sm:inline">Import QR</span>
      <span class="sm:hidden">Import</span>
    </button>
    <button
      id="home-toolbar-import-link-btn"
      class="flex items-center justify-center gap-2.5 px-10 h-14 btn-secondary text-xl"
      onclick={onImportLink}
    >
      <span>Import</span>
      <i class="fas fa-link"></i>
    </button>
    <button
      id="home-toolbar-clear-btn"
      class="flex items-center justify-center px-10 h-14 btn-danger text-xl"
      onclick={onClear}
    >
      Clear
    </button>
  </div>
</div>
