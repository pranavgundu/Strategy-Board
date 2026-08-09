<script lang="ts">
  import Icon from "./Icon.svelte";

  // IMPORTANT: purely static markup. `$lib/whiteboard.ts` (legacy canvas
  // engine) binds its own click listener directly to #whiteboard-draw-config
  // via getElementById and cycles the marker/eraser/checkbox icons itself by
  // mutating inline `style.display`. Do NOT attach an onclick handler here
  // and do NOT drive visibility from the board store - that would create a
  // second source of truth that fights the legacy engine's own DOM writes.
  // See PORT_NOTES.md.
</script>

<div
  id="whiteboard-draw-config"
  class="draw-config absolute flex flex-col justify-center items-center size-10 sm:size-12 md:size-14 lg:size-16 xl:size-20 max-[1024px]:scale-115 max-sm:!w-14 max-sm:!h-14 max-sm:scale-120 bottom-3 sm:bottom-4 md:bottom-6 max-sm:!bottom-3 right-3 sm:right-4 md:right-6 max-sm:!right-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-full cursor-pointer"
>
  <i id="whiteboard-draw-config-marker" class="tool-icon" style="display: inline">
    <Icon name="pencil" class="w-4 sm:w-4.5 md:w-5 lg:w-6 xl:w-7 max-sm:!w-5 text-white" />
  </i>
  <i id="whiteboard-draw-config-eraser" class="tool-icon" style="display: none">
    <Icon name="eraser" class="w-4 sm:w-4.5 md:w-5 lg:w-6 xl:w-7 max-sm:!w-5 text-white" />
  </i>
  <i id="whiteboard-draw-config-checkbox" class="tool-icon" style="display: none">
    <Icon name="square-check" class="w-4 sm:w-4.5 md:w-5 lg:w-6 xl:w-7 max-sm:!w-5 text-white" />
  </i>
  <!-- whiteboard.ts optional-chains a lookup for this id (no markup existed
       for it anywhere in the original app either - unfinished "text" tool).
       Rendered hidden, purely so the id exists per PORT_STATUS.md's list of
       22 ids Whiteboard depends on. -->
  <i
    id="whiteboard-draw-config-text"
    class="tool-icon text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl"
    style="display: none"
  >
    T
  </i>
</div>

<style>
  .draw-config {
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  .draw-config:hover {
    background: #252525;
    border-color: #555;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.07);
  }
  .draw-config:active {
    transform: scale(0.85) rotate(180deg);
  }
  .tool-icon {
    position: absolute;
    display: inline-flex;
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  /* Legacy engine toggles these icons via inline `display:none/inline`
     rather than a Svelte-owned class (see PORT_NOTES.md). Mirror the old
     attribute-selector-driven pop transition without redefining a Tailwind
     utility name. */
  .tool-icon[style*="display: none"] {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  .tool-icon:not([style*="display: none"]) {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
</style>
