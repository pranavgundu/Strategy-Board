<script lang="ts">
  // `$lib/whiteboard.ts` looks up #whiteboard-number-pad by id (currently
  // only to hide it: `classList.add("hidden")` in toggleMode). No digit
  // click handlers exist in the legacy engine yet and no markup for this
  // existed in index.html either - it's scaffolding for an unfinished
  // "enter a number" tool. Rendered here, statically, hidden by default,
  // purely so the id exists and the legacy lookup is not a silent no-op.
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
</script>

<div
  id="whiteboard-number-pad"
  class="hidden absolute grid grid-cols-3 gap-2 bottom-16 right-3 sm:right-4 md:right-6 max-[1024px]:bottom-16 max-sm:!bottom-18 max-sm:!right-3 max-sm:!gap-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-[10px] p-3"
>
  {#each digits as d (d)}
    <button
      id="whiteboard-number-{d}"
      class="min-w-11 min-h-11 max-sm:!min-w-12 max-sm:!min-h-12 rounded-[6px] bg-[#111111] border border-[#2a2a2a] text-[#e8e8e8] text-base font-semibold"
    >
      {d}
    </button>
  {/each}
  <button
    id="whiteboard-number-0"
    class="col-span-3 min-w-26 min-h-11 max-sm:!min-w-26 max-sm:!min-h-12 rounded-[6px] bg-[#111111] border border-[#2a2a2a] text-[#e8e8e8] text-base font-semibold"
  >
    0
  </button>
</div>
