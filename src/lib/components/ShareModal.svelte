<script lang="ts">
  import Modal from "./Modal.svelte";
  import { copyText, parseShareCode } from "$lib/features";

  let { open, shareLink, onClose, onNotice = () => {} }: { open: boolean; shareLink: string; onClose: () => void; onNotice?: (message: string) => void } = $props();

  let qrHost = $state<HTMLDivElement>();
  const shareCode = $derived(parseShareCode(shareLink) ?? "");

  // Same QR parameters the original used: high error correction at 180px.
  $effect(() => {
    const host = qrHost;
    if (!open || !host || !shareLink) return;
    let active = true;
    void (async () => {
      try {
        const QRCode = await import("qrcode");
        const canvas = document.createElement("canvas");
        await QRCode.toCanvas(canvas, shareLink, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 180,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (active) host.replaceChildren(canvas);
      } catch {
        if (active) host.replaceChildren();
      }
    })();
    return () => { active = false; host.replaceChildren(); };
  });

  async function copy(value: string, message: string) {
    try {
      await copyText(value);
      onNotice(message);
    } catch {
      onNotice("Could not copy to the clipboard.");
    }
  }
</script>

<Modal
  {open}
  id="share-success-container"
  title="Share Link Generated!"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-2xl max-h-96 bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
  {onClose}
>
  <div class="w-full px-6 py-4 text-base text-center text-[#e8e8e8] font-semibold flex-shrink-0 bg-[#111111] border-b border-[#1e1e1e]">
    Share Link Generated!
  </div>
  <div class="w-full px-6 py-6 flex flex-col gap-4 overflow-y-auto flex-1">
    <div class="text-center text-[#999]">
      <p class="text-sm mb-2">Share Code:</p>
      <div class="flex items-center justify-center gap-2">
        <p id="share-code-display" class="text-xl font-mono font-semibold tracking-wider text-[#e8e8e8] bg-[#0d0d0d] border border-[#2a2a2a] px-4 py-2 rounded-[6px]">
          {shareCode}
        </p>
        <button id="share-code-copy-btn" class="px-4 py-2 btn-secondary" title="Copy code" onclick={() => copy(shareCode, "Share code copied.")}>
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>
    <div class="text-center text-[#999]">
      <p class="text-sm mb-2">Share Link:</p>
      <div class="flex items-center justify-center gap-2">
        <input
          id="share-link-display"
          type="text"
          readonly
          value={shareLink}
          class="flex-1 text-sm text-[#e8e8e8] bg-[#0d0d0d] border border-[#2a2a2a] px-4 py-2 rounded-[6px] outline-0 font-mono"
        />
        <button id="share-link-copy-btn" class="px-4 py-2 btn-secondary" title="Copy link" onclick={() => copy(shareLink, "Share link copied.")}>
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>
    <div class="text-center text-[#999] text-xs">
      <i class="fas fa-info-circle"></i> Link expires in 1 week
    </div>
    <div class="w-full border-t border-[#1e1e1e] pt-6">
      <p class="text-sm text-[#a0a0a0] mb-4 text-center">QR Code:</p>
      <div class="flex justify-center">
        <div bind:this={qrHost} id="share-qr-code" class="bg-white p-4 rounded-[6px]"></div>
      </div>
      <p class="text-xs text-[#999] text-center mt-4">Scan to open link</p>
    </div>
  </div>
  <div class="flex w-full flex-shrink-0">
    <button
      id="share-success-close-btn"
      class="w-full text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] rounded-none rounded-b-[6px]"
      onclick={onClose}
    >
      Done
    </button>
  </div>
</Modal>
