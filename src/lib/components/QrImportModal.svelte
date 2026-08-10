<script lang="ts">
  import Modal from "./Modal.svelte";
  import { QrScanSession, restoreQrPacket, type CameraDevice } from "$lib/features";
  import type { MatchPacket, QrProgress } from "$lib/native/types";

  let { open, onImport, onClose, onNotice = () => {} }: { open: boolean; onImport: (packet: MatchPacket) => Promise<void>; onClose: () => void; onNotice?: (message: string) => void } = $props();
  let video = $state<HTMLVideoElement>();
  let cameras = $state<CameraDevice[]>([]);
  let cameraId = $state("");
  let status = $state("Preparing camera…");
  let progress = $state(0);
  let error = $state("");
  let scanner = $state<QrScanSession | null>(null);

  $effect(() => {
    if (!open || !video) return;
    let active = true;
    const session = new QrScanSession();
    scanner = session;
    async function report(next: QrProgress) {
      if (!active) return;
      if (next.status === "receiving") { progress = Math.round((next.received / next.total) * 100); status = `Receiving frame ${next.received} of ${next.total}…`; return; }
      status = "Restoring match…";
      try { await onImport(await restoreQrPacket(next.payload)); if (active) { onNotice("QR match imported."); onClose(); } }
      catch { if (active) error = "The QR data could not be imported."; }
    }
    void (async () => {
      try {
        cameras = await QrScanSession.listCameras();
        if (!active) return;
        cameraId = cameras[0]?.id ?? "";
        await session.start(video, { onProgress: report, onError: (reason) => { if (active) error = reason.message; } }, cameraId || undefined);
        if (active) status = "Point the camera at the animated QR code.";
      } catch { if (active) error = "Camera access is required to scan a QR export."; }
    })();
    return () => { active = false; void session.dispose(); if (scanner === session) scanner = null; };
  });

  async function selectCamera() { try { await scanner?.setCamera(cameraId); } catch { error = "Could not switch cameras."; } }
</script>

<Modal {open} title="Import QR code" {onClose}>
  <header class="modal-header"><h2>Import QR code</h2></header>
  <div class="modal-content stack">
    {#if cameras.length > 1}<label class="form-label" for="camera">Camera</label><select id="camera" class="input" bind:value={cameraId} onchange={selectCamera}>{#each cameras as camera}<option value={camera.id}>{camera.label || "Camera"}</option>{/each}</select>{/if}
    <video bind:this={video} class="qr-video" playsinline muted aria-label="QR scanner camera preview"></video>
    {#if error}<p class="form-error" role="alert">{error}</p>{:else}<p class="muted" aria-live="polite">{status}{#if progress} {progress}%{/if}</p>{/if}
  </div>
  <footer class="modal-actions"><button class="button primary" onclick={onClose}>Cancel</button></footer>
</Modal>

<style>.qr-video { width:100%; min-height:14rem; max-height:50dvh; object-fit:cover; border-radius:.65rem; background:#080a0d; }.form-error { margin:0; color:#ffaaaa; }</style>
