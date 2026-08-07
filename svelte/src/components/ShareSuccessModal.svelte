<script lang="ts">
  import Modal from "./Modal.svelte";
  import Icon from "./Icon.svelte";

  let {
    open,
    shareCode,
    shareLink,
    qrCodeDataUrl,
    onCopyCode,
    onCopyLink,
    onClose,
  }: {
    open: boolean;
    shareCode: string;
    shareLink: string;
    qrCodeDataUrl?: string;
    onCopyCode: () => void;
    onCopyLink: () => void;
    onClose: () => void;
  } = $props();
</script>

<Modal {open} onClose={onClose} maxWidth="max-w-2xl">
  <div class="w-full px-6 py-4 text-base text-center text-[#e8e8e8] font-semibold shrink-0 bg-[#111111] border-b border-[#1e1e1e]">
    Share Link Generated!
  </div>
  <div class="w-full px-6 py-6 flex flex-col gap-4 overflow-y-auto flex-1">
    <div class="text-center text-[#999]">
      <p class="text-sm mb-2">Share Code:</p>
      <div class="flex items-center justify-center gap-2">
        <p class="text-xl font-mono font-semibold tracking-wider text-[#e8e8e8] bg-[#0d0d0d] border border-[#2a2a2a] px-4 py-2 rounded-[6px]">
          {shareCode}
        </p>
        <button class="px-4 py-2 btn-secondary" title="Copy code" onclick={onCopyCode}>
          <Icon name="copy" class="w-4 h-4" />
        </button>
      </div>
    </div>
    <div class="text-center text-[#999]">
      <p class="text-sm mb-2">Share Link:</p>
      <div class="flex items-center justify-center gap-2">
        <input
          type="text"
          readonly
          value={shareLink}
          class="flex-1 text-sm text-[#e8e8e8] bg-[#0d0d0d] border border-[#2a2a2a] px-4 py-2 rounded-[6px] outline-0 font-mono"
        />
        <button class="px-4 py-2 btn-secondary" title="Copy link" onclick={onCopyLink}>
          <Icon name="copy" class="w-4 h-4" />
        </button>
      </div>
    </div>
    <div class="text-center text-[#999] text-xs flex items-center justify-center gap-1">
      <Icon name="info-circle" class="w-3.5 h-3.5" /> Link expires in 1 week
    </div>
    <div class="w-full border-t border-[#1e1e1e] pt-6">
      <p class="text-sm text-[#a0a0a0] mb-4 text-center">QR Code:</p>
      <div class="flex justify-center">
        <div class="bg-white p-4 rounded-[6px]">
          {#if qrCodeDataUrl}
            <img src={qrCodeDataUrl} alt="Share link QR code" class="w-40 h-40" />
          {/if}
        </div>
      </div>
      <p class="text-xs text-[#999] text-center mt-4">Scan to open link</p>
    </div>
  </div>
  <div class="flex w-full shrink-0">
    <button
      class="w-full text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] rounded-none rounded-b-[6px]"
      onclick={onClose}
    >
      Done
    </button>
  </div>
</Modal>
