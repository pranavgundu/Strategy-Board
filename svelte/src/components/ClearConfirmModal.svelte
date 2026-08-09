<script lang="ts">
  import Modal from "./Modal.svelte";

  let {
    open,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();
</script>

<Modal {open} onClose={onCancel} maxWidth="max-w-xl">
  <div class="w-full pt-6 pb-5 text-center text-[#e8e8e8] text-xl font-semibold border-b border-[#1e1e1e] bg-[#111111]">
    Clear All Data?
  </div>
  <div class="w-full px-8 py-6 text-base text-center text-[#999]">
    This will permanently delete all matches and data. This action cannot be undone.
  </div>
  <div class="flex w-full">
    <button
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] rounded-none"
      onclick={onCancel}
    >
      Cancel
    </button>
    <button
      class="w-1/2 text-center text-lg btn-danger p-5 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onConfirm}
    >
      Clear All
    </button>
  </div>
</Modal>
