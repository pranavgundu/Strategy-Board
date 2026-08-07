<script lang="ts">
  import { toast } from "$lib/stores/toast.svelte";
</script>

<div
  class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100000] flex flex-col gap-2 items-center pointer-events-none w-full px-4 sm:w-auto"
  role="status"
  aria-live="polite"
>
  {#each toast.messages as message (message.id)}
    <button
      type="button"
      class="pointer-events-auto max-w-md w-full sm:w-auto text-sm text-center text-[#e8e8e8] bg-[#181818] border border-[#2a2a2a] rounded-[6px] px-4 py-3 shadow-lg
      {message.kind === 'error' ? 'border-[#4a2020] text-[#e89090]' : ''}"
      onclick={() => toast.dismiss(message.id)}
    >
      {message.text}
    </button>
  {/each}
</div>
