<script lang="ts">
  // First-run "what's your team number" prompt. Not part of the frozen
  // app/board/toast contract (no team-number field exists there yet), so
  // this owns its own local input state and reports back via a callback.
  let {
    open,
    onSave,
  }: {
    open: boolean;
    onSave: (teamNumber: string) => void;
  } = $props();

  let value = $state("");

  function save() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-xs touch-none"
  >
    <div
      class="flex flex-col items-center justify-between w-full max-w-2xl bg-[#141414] border border-[#1e1e1e] rounded-[10px] overflow-hidden"
    >
      <div class="w-full pt-8 pb-6 px-8 sm:px-10 bg-[#111111] border-b border-[#1e1e1e]">
        <h2 class="text-2xl sm:text-3xl text-center text-[#e8e8e8] font-semibold">
          Welcome to Strategy Board!
        </h2>
        <p class="text-center text-[#999] text-lg sm:text-xl mt-2">
          What's your team number?
        </p>
      </div>
      <div class="w-full p-8 sm:p-10">
        <input
          type="number"
          bind:value
          placeholder="Enter team number"
          maxlength="5"
          inputmode="numeric"
          class="w-full text-3xl sm:text-4xl text-center text-[#e8e8e8] p-6 sm:p-7 bg-[#0d0d0d] border border-[#2a2a2a] rounded-[8px] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          onkeydown={(e) => e.key === "Enter" && save()}
        />
      </div>
      <div class="flex w-full">
        <button
          class="w-full text-center text-lg sm:text-xl btn-secondary p-5 sm:p-6 border-t border-[#1e1e1e] rounded-none"
          onclick={save}
        >
          Continue
        </button>
      </div>
    </div>
  </div>
{/if}
