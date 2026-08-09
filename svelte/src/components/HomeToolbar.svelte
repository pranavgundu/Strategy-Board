<script lang="ts">
  import Icon from "./Icon.svelte";

  let {
    onNew,
    onTBA,
    onImportQR,
    onImportLink,
    onClear,
  }: {
    onNew: () => void;
    onTBA: () => void;
    onImportQR: () => void;
    onImportLink: () => void;
    onClear: () => void;
  } = $props();
</script>

<div
  class="flex items-center justify-between w-full h-24 max-[834px]:h-auto bg-[#111111] border-b border-[#1e1e1e] px-10 md:px-16 max-[834px]:px-3 py-2 gap-2 pt-[env(safe-area-inset-top)]"
>
  <div
    class="text-2xl max-[834px]:text-[1.15rem] max-[480px]:text-[1.25rem] font-bold text-[#e8e8e8] select-none cursor-pointer tracking-tight min-w-0 truncate transition-all duration-300 hover:[text-shadow:0_0_10px_rgba(255,255,255,0.8),0_0_20px_rgba(255,255,255,0.6),0_0_30px_rgba(255,255,255,0.4),0_0_40px_rgba(255,255,255,0.2)]"
    onclick={() => location.reload()}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === "Enter" && location.reload()}
  >
    Strategy Board
  </div>
  <div class="flex gap-4 max-[834px]:gap-1.5 items-center flex-wrap justify-end">
    <button
      class="flex items-center justify-center px-10 max-[834px]:px-3 h-14 max-[834px]:h-auto btn-secondary text-xl max-[834px]:text-[0.95rem] max-[640px]:min-h-10 max-[480px]:min-h-9"
      onclick={onNew}
    >
      New
    </button>
    <button
      class="flex items-center justify-center gap-2.5 px-10 max-[834px]:px-3 h-14 max-[834px]:h-auto btn-secondary text-xl max-[834px]:text-[0.95rem] max-[640px]:min-h-10 max-[480px]:min-h-9"
      onclick={onTBA}
    >
      <span>TBA</span>
      <img src="./tba.svg" alt="TBA" class="h-6 sm:h-7 md:h-9 max-[834px]:h-5 w-auto" />
    </button>
    <button
      class="flex items-center justify-center px-10 max-[834px]:px-3 h-14 max-[834px]:h-auto btn-secondary text-xl max-[834px]:text-[0.95rem] max-[640px]:min-h-10 max-[480px]:min-h-9"
      onclick={onImportQR}
    >
      <span class="hidden sm:inline">Import QR</span>
      <span class="sm:hidden">Import</span>
    </button>
    <button
      class="flex items-center justify-center gap-2.5 px-10 max-[834px]:px-3 h-14 max-[834px]:h-auto btn-secondary text-xl max-[834px]:text-[0.95rem] max-[640px]:min-h-10 max-[480px]:min-h-9"
      onclick={onImportLink}
    >
      <span>Import</span>
      <Icon name="link" class="w-4 h-4" />
    </button>
    <button
      class="flex items-center justify-center px-10 max-[834px]:px-3 h-14 max-[834px]:h-auto btn-danger text-xl max-[834px]:text-[0.95rem] max-[640px]:min-h-10 max-[480px]:min-h-9"
      onclick={onClear}
    >
      Clear
    </button>
  </div>
</div>
