<script lang="ts">
  import Modal from "./Modal.svelte";

  let { open, onImport, onClose }: { open: boolean; onImport: (code: string) => void; onClose: () => void } = $props();
  let code = $state("");
</script>

<Modal
  {open}
  id="link-import-container"
  title="Import from Link"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-xl bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
  {onClose}
>
  <div class="w-full px-6 py-4 text-base text-center text-[#e8e8e8] font-semibold bg-[#111111] border-b border-[#1e1e1e]">
    Import from Link
  </div>
  <div class="w-full px-6 py-6 text-base text-center text-[#a0a0a0]">
    <input
      id="link-import-code"
      placeholder="Enter 6-character share code"
      maxlength="6"
      class="w-full p-3 text-base text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0 uppercase tracking-wider font-mono"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      bind:value={code}
      onkeydown={(event) => { if (event.key === "Enter" && code.trim()) onImport(code.trim().toUpperCase()); }}
    />
  </div>
  <div class="flex w-full">
    <button
      id="link-import-import-btn"
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] rounded-none rounded-bl-[6px]"
      onclick={() => onImport(code.trim().toUpperCase())}
    >
      Import
    </button>
    <button
      id="link-import-cancel-btn"
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none rounded-br-[6px]"
      onclick={onClose}
    >
      Cancel
    </button>
  </div>
</Modal>
