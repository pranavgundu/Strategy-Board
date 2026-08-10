<script lang="ts">
  import Modal from "./Modal.svelte";
  import { exportQrPdf, QrFramePlayer } from "$lib/features";
  import type { MatchPacket } from "$lib/native/types";

  let { open, packet = null, matchName, onClose, onNotice = () => {} }: { open: boolean; packet?: MatchPacket | null; matchName: string; onClose: () => void; onNotice?: (message: string) => void } = $props();

  let slots = $state<HTMLElement[]>([]);
  let player = $state<QrFramePlayer | null>(null);
  let progress = $state({ frameIndex: 0, total: 0, progress: 0 });
  let started = $state(false);
  let statusText = $state("");
  let exporting = $state(false);

  $effect(() => {
    if (!open || !packet || slots.length !== 3) return;
    let active = true;
    let current: QrFramePlayer | null = null;
    started = false;
    statusText = "";
    progress = { frameIndex: 0, total: 0, progress: 0 };
    void (async () => {
      try {
        current = await QrFramePlayer.fromPacket(packet!);
        if (!active) { current.dispose(); return; }
        await current.attach(slots);
        if (!active) { current.dispose(); return; }
        player = current;
      } catch {
        if (active) statusText = "Could not generate the QR export.";
      }
    })();
    return () => {
      active = false;
      current?.dispose();
      player = null;
      slots.forEach((slot) => slot.replaceChildren());
    };
  });

  function start() {
    if (!player) return;
    started = true;
    statusText = "";
    player.start((next) => (progress = next));
  }

  async function savePdf() {
    if (!packet) return;
    exporting = true;
    statusText = "Preparing PDF...";
    try {
      const pdfPlayer = await QrFramePlayer.fromPacket(packet);
      try {
        const result = await exportQrPdf([...pdfPlayer.frames], matchName);
        if (result.saved) onNotice("QR PDF exported.");
        statusText = "";
      } finally {
        pdfPlayer.dispose();
      }
    } catch {
      statusText = "Could not export the QR PDF.";
    } finally {
      exporting = false;
    }
  }
</script>

<Modal
  {open}
  id="qr-export-container"
  panelId="qr-export-inner-container"
  title="Export QR code"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-2xl max-h-96 bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-6 overflow-hidden"
  {onClose}
>
  <div class="w-full flex justify-end">
    <button
      id="qr-export-close-btn"
      class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
      title="Close export"
      onclick={onClose}
      aria-label="Close export"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>

  <div class="w-full flex flex-col items-center min-h-[60px] gap-3">
    <div class="flex gap-3">
      <button id="qr-export-start-btn" class="px-6 py-3 text-sm btn-secondary" onclick={start} disabled={!player || started}>Start</button>
      <button id="qr-export-pdf-btn" class="px-6 py-3 text-sm btn-secondary" onclick={() => void savePdf()} disabled={exporting}>Export as PDF</button>
    </div>

    {#if statusText || started}
      <div id="qr-export-status" class="text-[#e8e8e8] font-semibold select-none">
        <span id="qr-export-status-text" aria-live="polite">
          {statusText || `Frame ${progress.frameIndex + 1} of ${progress.total}`}
        </span>
      </div>
    {/if}

    {#if started && progress.total}
      <div id="qr-export-progress-wrap" class="w-full flex justify-center">
        <div id="qr-export-progress" class="qr-progress-wrap" aria-hidden="true">
          <div id="qr-export-progress-bar" class="qr-progress-bar" class:complete={progress.progress >= 100} style="width: {progress.progress}%"></div>
        </div>
      </div>
    {/if}
  </div>

  <div class="w-full flex items-center justify-center overflow-hidden flex-1">
    {#each [0, 1, 2] as index}
      <div bind:this={slots[index]} id="qr-export-code-worker-{index}" class="qr-export-worker w-full flex items-center justify-center" style="z-index: {index + 1}" hidden={index !== 0}></div>
    {/each}
  </div>
</Modal>

<style>
  /* The frame player toggles the `hidden` attribute; the utility `display` class
     would otherwise win over the user-agent rule. */
  .qr-export-worker[hidden] {
    display: none !important;
  }
</style>
