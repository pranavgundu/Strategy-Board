<script lang="ts">
  // Presentational shell for QR camera-scan import. Camera enumeration and
  // frame decoding are logic-layer concerns (not part of the frozen
  // contract yet); this exposes the <video> element via `registerVideo` so
  // the caller can attach a MediaStream to it.
  let {
    open,
    cameras = [],
    selectedCameraId = $bindable(""),
    statusText = "",
    scanning = false,
    progress = 0,
    registerVideo,
    onClose,
  }: {
    open: boolean;
    cameras?: { id: string; label: string }[];
    selectedCameraId?: string;
    statusText?: string;
    scanning?: boolean;
    progress?: number;
    registerVideo?: (video: HTMLVideoElement) => void;
    onClose: () => void;
  } = $props();

  let videoEl: HTMLVideoElement | undefined = $state();

  $effect(() => {
    if (videoEl) registerVideo?.(videoEl);
  });
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs touch-none"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={(e) => e.key === "Escape" && onClose()}
  >
    <div
      class="flex flex-col items-center justify-between bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 max-h-[90dvh] w-[min(92vw,820px)] overflow-y-auto scroll-momentum"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      {#if statusText}
        <div class="mb-3 text-[#e8e8e8] font-semibold select-none flex items-center gap-2">
          <span>{statusText}</span>
          {#if scanning}
            <span class="qr-dots" aria-hidden="true">
              <span class="qr-dot"></span>
              <span class="qr-dot"></span>
              <span class="qr-dot"></span>
            </span>
          {/if}
        </div>
      {/if}

      {#if scanning}
        <div class="w-full flex justify-center">
          <div class="qr-progress-wrap">
            <div class="qr-progress-bar" style="width: {progress}%"></div>
          </div>
        </div>
      {/if}

      {#if cameras.length > 0}
        <select
          bind:value={selectedCameraId}
          class="text-sm mt-3 w-full rounded-[6px] p-2 bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] outline-0"
        >
          {#each cameras as cam (cam.id)}
            <option value={cam.id}>{cam.label}</option>
          {/each}
        </select>
      {/if}
      <video bind:this={videoEl} playsinline class="w-full mt-3 rounded-[6px] max-h-[44vh] max-sm:max-h-[40vh]"></video>
    </div>
  </div>
{/if}

<style>
  .qr-progress-wrap {
    width: 90%;
    height: 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 6px;
  }
  .qr-progress-bar {
    width: 0%;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 60%);
    transition: width 300ms ease-out;
  }
  .qr-dots {
    display: inline-flex;
    gap: 4px;
  }
  .qr-dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.4;
    animation: qr-dot-pulse 1.2s ease-in-out infinite;
  }
  .qr-dot:nth-child(2) {
    animation-delay: 0.15s;
  }
  .qr-dot:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes qr-dot-pulse {
    0%,
    80%,
    100% {
      opacity: 0.3;
    }
    40% {
      opacity: 1;
    }
  }
</style>
