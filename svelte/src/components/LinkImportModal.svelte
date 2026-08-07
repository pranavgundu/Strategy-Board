<script lang="ts">
  import Modal from "./Modal.svelte";

  let {
    open,
    code = $bindable(""),
    status = "",
    onImport,
    onCancel,
  }: {
    open: boolean;
    code?: string;
    status?: string;
    onImport: () => void;
    onCancel: () => void;
  } = $props();
</script>

<Modal {open} onClose={onCancel} maxWidth="max-w-xl">
  <div class="w-full px-6 py-4 text-base text-center text-[#e8e8e8] font-semibold bg-[#111111] border-b border-[#1e1e1e]">
    Import from Link
  </div>
  <div class="w-full px-6 py-6 text-base text-center text-[#a0a0a0]">
    <input
      bind:value={code}
      placeholder="Enter 6-character share code"
      maxlength="6"
      class="w-full p-3 text-base text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0 uppercase tracking-wider font-mono"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
    {#if status}
      <div class="mt-4 text-sm text-[#a0a0a0]">{status}</div>
    {/if}
  </div>
  <div class="flex w-full">
    <button
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] rounded-none rounded-bl-[6px]"
      onclick={onImport}
    >
      Import
    </button>
    <button
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none rounded-br-[6px]"
      onclick={onCancel}
    >
      Cancel
    </button>
  </div>
</Modal>
