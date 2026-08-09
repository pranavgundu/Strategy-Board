<script lang="ts">
  import Icon from "./Icon.svelte";

  let dismissed = $state(false);
</script>

{#if !dismissed}
  <div
    class="orientation-warning fixed inset-0 z-[100000] flex-col items-center justify-center text-center p-5 bg-black/95"
  >
    <Icon name="rotate-device" class="w-20 h-20 mb-10 text-white animate-pulse" />
    <div class="text-white text-2xl font-semibold mb-2.5 mt-5">
      Please rotate your device
    </div>
    <div class="text-white/70 text-base mb-7">
      This app works best in landscape mode
    </div>
    <button
      class="btn-secondary px-6 py-3 text-base"
      onclick={() => (dismissed = true)}
    >
      Continue in Portrait
    </button>
  </div>
{/if}

<style>
  /* Genuinely needs a raw media query: Tailwind has no single utility for
     "small viewport AND portrait orientation" gating. */
  .orientation-warning {
    display: none;
  }
  @media (max-width: 1024px) and (orientation: portrait) {
    .orientation-warning {
      display: flex;
    }
  }
</style>
