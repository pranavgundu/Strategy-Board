<script lang="ts">
  import Icon from "./Icon.svelte";

  // Presentational shell for animated multi-frame QR export. The frame
  // generation itself (chunking match data into a sequence of QR codes and
  // painting them into worker slots) is logic-layer and not yet frozen, so
  // this component exposes the three worker slot elements via
  // `registerWorkers` and lets the caller drive `phase` / `progress`.
  let {
    open,
    phase = "idle",
    statusText = "",
    progress = 0,
    registerWorkers,
    onStart,
    onExportPdf,
    onClose,
  }: {
    open: boolean;
    phase?: "idle" | "running" | "done";
    statusText?: string;
    progress?: number;
    registerWorkers?: (workers: HTMLDivElement[]) => void;
    onStart: () => void;
    onExportPdf: () => void;
    onClose: () => void;
  } = $props();

  let worker0: HTMLDivElement | undefined = $state();
  let worker1: HTMLDivElement | undefined = $state();
  let worker2: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (worker0 && worker1 && worker2) {
      registerWorkers?.([worker0, worker1, worker2]);
    }
  });
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs touch-none"
    style="touch-action: auto"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={(e) => e.key === "Escape" && onClose()}
  >
    <div
      class="flex flex-col items-center gap-3 w-full max-w-2xl max-h-[85dvh] bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="w-full flex justify-end">
        <button
          class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
          title="Close export"
          onclick={onClose}
        >
          <Icon name="times" class="w-4 h-4" />
        </button>
      </div>

      <div class="w-full flex flex-col items-center min-h-[60px] gap-3">
        <div class="flex gap-3">
          <button class="px-6 py-3 text-sm btn-secondary" onclick={onStart}>Start</button>
          <button class="px-6 py-3 text-sm btn-secondary" onclick={onExportPdf}>Export as PDF</button>
        </div>

        {#if statusText}
          <div class="text-[#e8e8e8] font-semibold select-none flex items-center gap-2">
            <span>{statusText}</span>
            {#if phase === "running"}
              <span class="qr-dots" aria-hidden="true">
                <span class="qr-dot"></span>
                <span class="qr-dot"></span>
                <span class="qr-dot"></span>
              </span>
            {/if}
          </div>
        {/if}

        {#if phase === "running"}
          <div class="w-full flex justify-center">
            <div class="qr-progress-wrap">
              <div class="qr-progress-bar" class:complete={progress >= 100} style="width: {progress}%"></div>
            </div>
          </div>
        {/if}
      </div>

      <div class="w-full flex items-center justify-center overflow-hidden flex-1 relative">
        <div bind:this={worker0} class="qr-worker-slot" class:hidden={phase === "idle"} style="z-index: 1"></div>
        <div bind:this={worker1} class="qr-worker-slot hidden" style="z-index: 2"></div>
        <div bind:this={worker2} class="qr-worker-slot hidden" style="z-index: 3"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .qr-worker-slot {
    position: absolute;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr-worker-slot :global(canvas) {
    max-width: 100%;
    max-height: 200px;
    width: auto !important;
    height: auto !important;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  .qr-progress-wrap {
    width: 90%;
    height: 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 6px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }
  .qr-progress-bar {
    width: 0%;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 60%);
    transition: width 300ms ease-out;
  }
  .qr-progress-bar.complete {
    box-shadow: 0 0 18px rgba(34, 197, 94, 0.25), inset 0 -1px 4px rgba(0, 0, 0, 0.12);
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
