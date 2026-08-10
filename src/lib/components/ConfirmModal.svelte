<script lang="ts">
  import Modal from "./Modal.svelte";

  let { open, title, message, confirmLabel = "Confirm", destructive = false, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void; onClose: () => void } = $props();
</script>

<Modal
  {open}
  id="clear-confirm-container"
  {title}
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-xl bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
  {onClose}
>
  <div class="w-full pt-6 pb-5 text-center text-[#e8e8e8] text-xl font-semibold border-b border-[#1e1e1e] bg-[#111111]">
    {title}
  </div>
  <div class="w-full px-8 py-6 text-base text-center text-[#999]">{message}</div>
  <div class="flex w-full">
    <button
      id="clear-confirm-cancel-btn"
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] rounded-none"
      onclick={onClose}
    >
      Cancel
    </button>
    <button
      id="clear-confirm-clear-btn"
      class="w-1/2 text-center text-lg {destructive ? 'btn-danger' : 'btn-secondary'} p-5 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onConfirm}
    >
      {confirmLabel}
    </button>
  </div>
</Modal>
