<script lang="ts">
  import Modal from "./Modal.svelte";
  import { exportQrPdf, QrFramePlayer } from "$lib/features";
  import type { MatchPacket } from "$lib/native/types";

  let { open, packet = null, matchName, onClose, onNotice = () => {} }: { open: boolean; packet?: MatchPacket | null; matchName: string; onClose: () => void; onNotice?: (message: string) => void } = $props();
  let slots = $state<HTMLElement[]>([]);
  let progress = $state({ frameIndex: 0, total: 0, progress: 0 });
  let error = $state("");
  let exporting = $state(false);

  $effect(() => {
    if (!open || !packet || slots.length !== 3) return;
    let active = true;
    let player: QrFramePlayer | null = null;
    error = "";
    void (async () => {
      try {
        player = await QrFramePlayer.fromPacket(packet);
        if (!active) { player.dispose(); return; }
        await player.attach(slots);
        if (!active) { player.dispose(); return; }
        player.start((next) => { if (active) progress = next; });
      } catch {
        if (active) error = "Could not generate the QR export.";
      }
    })();
    return () => { active = false; player?.dispose(); slots.forEach((slot) => slot.replaceChildren()); };
  });

  async function savePdf() {
    if (!packet) return;
    exporting = true;
    try {
      const player = await QrFramePlayer.fromPacket(packet);
      try {
        const result = await exportQrPdf([...player.frames], matchName);
        if (result.saved) onNotice("QR PDF exported.");
      } finally { player.dispose(); }
    } catch { error = "Could not export the QR PDF."; }
    finally { exporting = false; }
  }
</script>

<Modal {open} title="Export QR code" {onClose}>
  <header class="modal-header"><h2>Export QR code</h2></header>
  <div class="modal-content stack"><p class="muted">Scan every frame in order to import <strong>{matchName}</strong>.</p>
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <div class="qr-player" aria-label="Animated QR code export">
      {#each [0, 1, 2] as index}<div bind:this={slots[index]} class="qr-frame" hidden={index !== 0}></div>{/each}
    </div>
    {#if progress.total}<p class="qr-progress" aria-live="polite">Frame {progress.frameIndex + 1} of {progress.total} · {progress.progress}%</p>{/if}
  </div>
  <footer class="modal-actions"><button class="button" onclick={savePdf} disabled={exporting}>{exporting ? "Exporting…" : "Export PDF"}</button><button class="button primary" onclick={onClose}>Done</button></footer>
</Modal>

<style>.qr-player { display:grid; place-items:center; min-height:18rem; border-radius:.65rem; background:#fff; }.qr-frame :global(canvas) { display:block; max-width:min(100%, 28rem); max-height:28rem; width:auto!important; height:auto!important; }.qr-progress { margin:0; text-align:center; color:#9ba8b8; font-variant-numeric:tabular-nums; }.form-error { margin:0; color:#ffaaaa; }</style>
