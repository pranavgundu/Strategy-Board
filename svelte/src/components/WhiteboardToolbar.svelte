<script lang="ts">
  import { board } from "$lib/stores/board.svelte";
  import type { BoardMode } from "$lib/stores/board.svelte";

  const MODES: Array<{ id: BoardMode; label: string; hidden?: boolean }> = [
    { id: "auto", label: "AUTO" },
    { id: "transition", label: "TRANSITION", hidden: true },
    { id: "teleop", label: "TELEOP" },
    { id: "endgame", label: "ENDGAME" },
    { id: "notes", label: "NOTES" },
    { id: "statbotics", label: "STATS", hidden: true },
  ];

  let {
    onExit,
    onToggleView,
  }: {
    onExit: () => void;
    onToggleView: () => void;
  } = $props();
</script>

<div
  id="whiteboard-toolbar"
  class="relative flex items-center w-full h-16 md:h-24 max-[640px]:!h-12 max-[480px]:!h-10 bg-[#111111] border-b border-[#1e1e1e] pt-[env(safe-area-inset-top)]"
  style="z-index: 999"
>
  <div class="toolbar-left flex items-center ml-8 md:ml-14 max-[1024px]:ml-2 gap-4 max-[1024px]:gap-1.5">
    <button
      id="whiteboard-toolbar-back"
      class="text-base md:text-xl max-[1024px]:text-sm font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3 max-[1024px]:px-2 max-[1024px]:py-1.5"
      onclick={onExit}
    >
      EXIT
    </button>
    <button
      id="whiteboard-toolbar-undo"
      class="text-base md:text-xl max-[1024px]:text-sm font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3 max-[1024px]:px-2 max-[1024px]:py-1.5"
      class:is-disabled={!board.canUndo}
      disabled={!board.canUndo}
      onclick={() => board.undo()}
    >
      UNDO
    </button>
    <button
      id="whiteboard-toolbar-redo"
      class="text-base md:text-xl max-[1024px]:text-sm font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3 max-[1024px]:px-2 max-[1024px]:py-1.5"
    >
      REDO
    </button>
  </div>

  <div
    id="whiteboard-toolbar-mode-select"
    class="toolbar-center flex justify-center items-center gap-3 max-[1024px]:gap-2 max-[640px]:gap-1"
  >
    {#each MODES as m (m.id)}
      <button
        id="whiteboard-toolbar-mode-{m.id}"
        class="mode-btn select-none touch-none"
        class:mode-btn-active={board.mode === m.id}
        class:hidden={m.hidden}
        onclick={() => board.setMode(m.id)}
      >
        {m.label}
      </button>
    {/each}
  </div>

  <div class="toolbar-right flex items-center justify-end gap-4 max-[1024px]:gap-1.5 mr-8 md:mr-14 max-[1024px]:mr-2">
    <button
      id="whiteboard-toolbar-view-toggle"
      class="text-base md:text-xl max-[1024px]:text-sm font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3 max-[1024px]:px-2 max-[1024px]:py-1.5"
      onclick={onToggleView}
    >
      TOGGLE VIEW
    </button>
  </div>
</div>

<style>
  #whiteboard-toolbar .toolbar-left {
    flex: 0 0 auto;
    position: relative;
    z-index: 1;
  }
  #whiteboard-toolbar .toolbar-right {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }
  #whiteboard-toolbar-mode-select {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: auto;
  }
  #whiteboard-toolbar .toolbar-right button {
    flex-shrink: 0;
    white-space: nowrap;
  }
  /* #whiteboard-toolbar-undo[style*="opacity: 0.5"] driven by the legacy
     engine's inline style writes (see updateUndoRedoButtons in
     whiteboard.ts) - kept as an attribute selector rather than a
     store-driven class for the same reason as DrawConfig.svelte. */
  #whiteboard-toolbar-undo.is-disabled,
  #whiteboard-toolbar-redo.is-disabled {
    pointer-events: none;
    filter: grayscale(0.5);
  }
</style>
