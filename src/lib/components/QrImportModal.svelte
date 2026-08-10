<script lang="ts">
  import Modal from "./Modal.svelte";
  import { QrScanSession, restoreQrPacket, type CameraDevice } from "$lib/features";
  import type { MatchPacket, QrProgress } from "$lib/native/types";

  let { open, onImport, onClose, onNotice = () => {} }: { open: boolean; onImport: (packet: MatchPacket) => Promise<void>; onClose: () => void; onNotice?: (message: string) => void } = $props();

  let video = $state<HTMLVideoElement>();
  let cameras = $state<CameraDevice[]>([]);
  let cameraId = $state("");
  let status = $state("Preparing camera...");
  let progress = $state(0);
  let scanner = $state<QrScanSession | null>(null);

  $effect(() => {
    if (!open || !video) return;
    let active = true;
    const session = new QrScanSession();
    scanner = session;
    progress = 0;
    async function report(next: QrProgress) {
      if (!active) return;
      if (next.status === "receiving") {
        progress = Math.round((next.received / next.total) * 100);
        status = `Receiving frame ${next.received} of ${next.total}...`;
        return;
      }
      status = "Restoring match...";
      try {
        await onImport(await restoreQrPacket(next.payload));
        if (active) {
          onNotice("QR match imported.");
          onClose();
        }
      } catch {
        if (active) status = "The QR data could not be imported.";
      }
    }
    void (async () => {
      try {
        cameras = await QrScanSession.listCameras();
        if (!active) return;
        cameraId = cameras[0]?.id ?? "";
        await session.start(video!, { onProgress: report, onError: (reason) => { if (active) status = reason.message; } }, cameraId || undefined);
        if (active) status = "Point the camera at the animated QR code.";
      } catch {
        if (active) status = "Camera access is required to scan a QR export.";
      }
    })();
    return () => { active = false; void session.dispose(); if (scanner === session) scanner = null; };
  });

  async function selectCamera() {
    try {
      await scanner?.setCamera(cameraId);
    } catch {
      status = "Could not switch cameras.";
    }
  }
</script>

<Modal
  {open}
  id="qr-import-container"
  panelId="qr-import-inner-container"
  layer=""
  title="Import QR code"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 max-h-[90vh] overflow-y-auto"
  {onClose}
>
  <div id="qr-import-status" class="mb-3 text-[#e8e8e8] font-semibold select-none">
    <span id="qr-import-status-text" aria-live="polite">{status}</span>
  </div>

  <div id="qr-import-progress-wrap" class="w-full flex justify-center">
    <div id="qr-import-progress" class="qr-progress-wrap" aria-hidden="true">
      <div id="qr-import-progress-bar" class="qr-progress-bar" class:complete={progress >= 100} style="width: {progress}%"></div>
    </div>
  </div>

  <select
    id="qr-import-camera-select"
    class="text-sm mt-3 w-full rounded-[6px] p-2 bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] outline-0"
    bind:value={cameraId}
    onchange={selectCamera}
    aria-label="Camera"
  >
    {#each cameras as camera (camera.id)}
      <option value={camera.id}>{camera.label || "Camera"}</option>
    {/each}
  </select>
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} id="qr-import-video" playsinline muted class="w-full mt-3 rounded-[6px]" style="max-height: 44vh"></video>
</Modal>
