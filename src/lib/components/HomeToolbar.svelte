<script lang="ts">
  let { onNew, onTba, onImportQr, onImportLink, onClear }: { onNew: () => void; onTba: () => void; onImportQr: () => void; onImportLink: () => void; onClear: () => void } = $props();
</script>

<div
  id="home-toolbar"
  class="flex items-center justify-between gap-3 w-full h-24 bg-[#111111] border-b border-[#1e1e1e] px-4 sm:px-6 md:px-10 lg:px-16 pt-[env(safe-area-inset-top)]"
>
  <div
    id="home-toolbar-logo"
    class="min-w-0 truncate text-lg sm:text-xl md:text-2xl font-bold text-[#e8e8e8] select-none cursor-pointer tracking-tight"
    onclick={() => location.reload()}
    role="button"
    tabindex="0"
    onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") location.reload(); }}
  >
    Strategy Board
  </div>
  <!-- Paddings step down with the viewport: at full size the five buttons plus the
       logo need ~1150px, so anything narrower than `lg` has to compact or the row
       overflows the bar. -->
  <div class="flex shrink-0 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 items-center">
    <button
      id="home-toolbar-new-btn"
      class="flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-10 h-11 md:h-12 lg:h-14 btn-secondary text-sm sm:text-base md:text-lg lg:text-xl"
      onclick={onNew}
    >
      New
    </button>
    <button
      id="home-toolbar-tba-btn"
      class="flex items-center justify-center gap-1.5 md:gap-2 lg:gap-2.5 px-3 sm:px-4 md:px-6 lg:px-10 h-11 md:h-12 lg:h-14 btn-secondary text-sm sm:text-base md:text-lg lg:text-xl"
      onclick={onTba}
    >
      <span>TBA</span>
      <img src="/tba.svg" alt="TBA" class="h-6 sm:h-7 md:h-9 w-auto" />
    </button>
    <button
      id="home-toolbar-import-btn"
      class="flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-10 h-11 md:h-12 lg:h-14 btn-secondary text-sm sm:text-base md:text-lg lg:text-xl"
      onclick={onImportQr}
    >
      <span class="hidden sm:inline">Import QR</span>
      <span class="sm:hidden">Import</span>
    </button>
    <button
      id="home-toolbar-import-link-btn"
      class="flex items-center justify-center gap-1.5 md:gap-2 lg:gap-2.5 px-3 sm:px-4 md:px-6 lg:px-10 h-11 md:h-12 lg:h-14 btn-secondary text-sm sm:text-base md:text-lg lg:text-xl"
      onclick={onImportLink}
    >
      <span>Import</span>
      <i class="fas fa-link"></i>
    </button>
    <button
      id="home-toolbar-clear-btn"
      class="flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-10 h-11 md:h-12 lg:h-14 btn-danger text-sm sm:text-base md:text-lg lg:text-xl"
      onclick={onClear}
    >
      Clear
    </button>
  </div>
</div>
