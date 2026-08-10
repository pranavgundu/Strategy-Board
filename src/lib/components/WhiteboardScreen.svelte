<script lang="ts">
  import { tick } from "svelte";
  import { app } from "$lib/stores/app.svelte";
  import { createWhiteboardController, whiteboardMatchFromPacket, writeWhiteboardPacket, type WhiteboardController, type WhiteboardMatch, type WhiteboardMode, type WhiteboardState } from "$lib/whiteboard";
  import { safeFilename, savePng } from "$lib/features";
  import StatboticsPanel from "./StatboticsPanel.svelte";

  let { pngRequest = 0, onNotice = () => {} }: { pngRequest?: number; onNotice?: (message: string) => void } = $props();

  let container = $state<HTMLDivElement>();
  let background = $state<HTMLCanvasElement>();
  let items = $state<HTMLCanvasElement>();
  let drawing = $state<HTMLCanvasElement>();
  let controller = $state<WhiteboardController | null>(null);
  let ui = $state<WhiteboardState>({ mode: "auto", tool: "marker", color: 0, view: "full", canUndo: false, canRedo: false, isCanvasVisible: true });
  let fieldYear = $state<number | undefined>(undefined);
  let toolbar = $state<HTMLDivElement>();
  let toolbarLeft = $state<HTMLDivElement>();
  let toolbarModes = $state<HTMLDivElement>();
  let toolbarRight = $state<HTMLDivElement>();
  let toolbarFit = $state<"" | "toolbar-condensed" | "toolbar-ultra">("");

  // Colour picker: expanded shows every swatch plus the close control; collapsed
  // leaves only the active swatch, exactly as the original behaved.
  let paletteOpen = $state(true);
  let pickedColor = $state<number | null>(null);
  let paletteClosing = $state(false);

  let loadedMatchId = "";
  let commitQueue: Promise<void> = Promise.resolve();
  let handledPngRequest = 0;

  const swatches = [
    { id: "yellow", index: 4, classes: "bg-yellow-500 border-amber-600" },
    { id: "green", index: 3, classes: "bg-green-500 border-green-700" },
    { id: "blue", index: 2, classes: "bg-blue-500 border-blue-700" },
    { id: "red", index: 1, classes: "bg-red-500 border-red-700" },
    { id: "white", index: 0, classes: "bg-white border-gray-300" },
  ] as const;

  const teleopLabel = $derived(fieldYear === 2026 ? "ACTIVE" : "TELEOP");
  const endgameLabel = $derived(fieldYear === 2026 ? "INACTIVE" : "ENDGAME");
  const showTransition = $derived(fieldYear === 2026);
  const showStats = $derived(
    [app.activeMatch?.redOne, app.activeMatch?.redTwo, app.activeMatch?.redThree, app.activeMatch?.blueOne, app.activeMatch?.blueTwo, app.activeMatch?.blueThree]
      .some((team) => team && team.trim() !== ""),
  );

  function queueCommit(match: WhiteboardMatch) {
    const source = app.activeMatch;
    if (!source || source.id !== match.id) return;
    const packet = writeWhiteboardPacket(source.packet, match);
    commitQueue = commitQueue.then(() => app.commitPacket(packet)).catch(() => onNotice("Could not save the latest whiteboard change."));
  }

  $effect(() => {
    if (!container || !background || !items || !drawing || app.screen !== "whiteboard") return;
    const next = createWhiteboardController({ onStateChange: (state) => (ui = state), onCommit: ({ match }) => queueCommit(match) });
    controller = next;
    const destroy = next.mount({ container, background, items, drawing });
    return () => { destroy(); if (controller === next) controller = null; loadedMatchId = ""; };
  });

  $effect(() => {
    const active = app.activeMatch;
    if (!controller || !active || active.id === loadedMatchId) return;
    loadedMatchId = active.id;
    controller.setMatch(whiteboardMatchFromPacket(active.packet));
    fieldYear = controller.getCurrentFieldYear();
  });

  $effect(() => {
    if (!pngRequest || pngRequest === handledPngRequest || !controller) return;
    handledPngRequest = pngRequest;
    tick().then(exportPng);
  });

  // Mirrors the original width probe that shrinks the centred mode row when the
  // three toolbar groups no longer fit side by side.
  $effect(() => {
    if (!toolbar || !toolbarLeft || !toolbarModes || !toolbarRight) return;
    const measure = () => {
      const required = toolbarLeft!.getBoundingClientRect().width + toolbarModes!.getBoundingClientRect().width + toolbarRight!.getBoundingClientRect().width + 96;
      const slack = toolbar!.getBoundingClientRect().width - required;
      toolbarFit = slack >= 0 ? "" : slack < -120 ? "toolbar-ultra" : "toolbar-condensed";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toolbar);
    return () => observer.disconnect();
  });

  function setMode(mode: WhiteboardMode) { controller?.setMode(mode); }

  /** Cycles marker → eraser → checkbox (notes only) → marker. */
  function cycleTool() {
    controller?.toggleTool();
  }

  function pickColor(index: number) {
    if (!paletteOpen) { paletteOpen = true; return; }
    pickedColor = index;
    controller?.setColor(index);
  }

  function collapsePalette() {
    paletteClosing = true;
    window.setTimeout(() => { paletteClosing = false; paletteOpen = false; }, 300);
  }

  function exit() { app.closeMatch(); }

  async function exportPng() {
    const data = controller?.exportPng();
    if (!data) { onNotice("The whiteboard is not ready to export yet."); return; }
    try {
      const result = await savePng(data, safeFilename(app.activeMatch?.matchName || "strategy-board"));
      if (result.saved) onNotice("PNG exported.");
    } catch {
      onNotice("Could not export the PNG.");
    }
  }
</script>

{#if app.screen === "whiteboard"}
  <div id="whiteboard-container" class="flex flex-col w-full h-full touch-none">
    <div
      bind:this={toolbar}
      id="whiteboard-toolbar"
      class="relative items-center w-full h-16 md:h-24 bg-[#111111] border-b border-[#1e1e1e] pt-[env(safe-area-inset-top)] {toolbarFit}"
      style="z-index: 999"
    >
      <div bind:this={toolbarLeft} class="toolbar-left flex items-center ml-8 md:ml-14 gap-4">
        <button
          id="whiteboard-toolbar-back"
          class="text-base md:text-xl font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3"
          onclick={exit}
        >
          EXIT
        </button>
        <button
          id="whiteboard-toolbar-undo"
          class="text-base md:text-xl font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3"
          style="opacity: {ui.canUndo ? 1 : 0.5}"
          onclick={() => controller?.undo()}
        >
          UNDO
        </button>
      </div>

      <div bind:this={toolbarModes} id="whiteboard-toolbar-mode-select" class="toolbar-center flex justify-center items-center gap-3">
        <button id="whiteboard-toolbar-mode-auto" class="mode-btn select-none touch-none" class:mode-btn-active={ui.mode === "auto"} onclick={() => setMode("auto")}>AUTO</button>
        {#if showTransition}
          <button id="whiteboard-toolbar-mode-transition" class="mode-btn select-none touch-none" class:mode-btn-active={ui.mode === "transition"} onclick={() => setMode("transition")}>TRANSITION</button>
        {/if}
        <button id="whiteboard-toolbar-mode-teleop" class="mode-btn select-none touch-none" class:mode-btn-active={ui.mode === "teleop"} onclick={() => setMode("teleop")}>{teleopLabel}</button>
        <button id="whiteboard-toolbar-mode-endgame" class="mode-btn select-none touch-none" class:mode-btn-active={ui.mode === "endgame"} onclick={() => setMode("endgame")}>{endgameLabel}</button>
        <button id="whiteboard-toolbar-mode-notes" class="mode-btn select-none touch-none" class:mode-btn-active={ui.mode === "notes"} onclick={() => setMode("notes")}>NOTES</button>
        {#if showStats}
          <button id="whiteboard-toolbar-mode-statbotics" class="mode-btn select-none touch-none" class:mode-btn-active={ui.mode === "statbotics"} onclick={() => setMode("statbotics")}>STATS</button>
        {/if}
      </div>

      <div bind:this={toolbarRight} class="toolbar-right flex items-center justify-end gap-4 mr-8 md:mr-14">
        <button
          id="whiteboard-toolbar-view-toggle"
          class="text-base md:text-xl font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3"
          onclick={() => controller?.toggleView()}
        >
          TOGGLE VIEW
        </button>
      </div>
    </div>

    <div
      bind:this={container}
      id="whiteboard-wrapper"
      class="w-full flex-1 min-h-0 m-0 p-0 bg-[#0d0d0d]"
      class:hidden={!ui.isCanvasVisible}
    >
      <canvas bind:this={background} id="whiteboard-canvas-background" width="3510" height="1610" class="absolute m-0 select-none touch-none"></canvas>
      <canvas bind:this={items} id="whiteboard-canvas-items" width="3510" height="1610" class="absolute m-0 select-none touch-none"></canvas>
      <canvas bind:this={drawing} id="whiteboard-canvas-drawing" width="3510" height="1610" class="absolute m-0 select-none touch-none"></canvas>
    </div>

    {#if !ui.isCanvasVisible}
      <div id="whiteboard-statbotics-container" class="w-full flex-1 min-h-0 m-0 p-0 bg-[#0d0d0d] flex flex-col overflow-y-auto">
        <StatboticsPanel match={app.activeMatch} visible={!ui.isCanvasVisible} />
      </div>
    {/if}

    {#if ui.isCanvasVisible}
      <div
        id="whiteboard-draw-config"
        class="absolute flex flex-col justify-center items-center size-10 sm:size-12 md:size-14 lg:size-16 xl:size-20 bottom-3 sm:bottom-4 md:bottom-6 right-3 sm:right-4 md:right-6 bg-[#1a1a1a] border border-[#3a3a3a] rounded-full cursor-pointer"
        role="button"
        tabindex="0"
        aria-label="Change tool"
        onclick={cycleTool}
        onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") cycleTool(); }}
      >
        <i id="whiteboard-draw-config-marker" class="fa fa-pencil text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white" style:display={ui.tool === "marker" ? "inline" : "none"}></i>
        <i id="whiteboard-draw-config-eraser" class="fa fa-eraser text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white" style:display={ui.tool === "eraser" ? "inline" : "none"}></i>
        <i id="whiteboard-draw-config-checkbox" class="fa-regular fa-square-check text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white" style:display={ui.tool === "checkbox" ? "inline" : "none"}></i>
      </div>

      <div
        id="whiteboard-color-config"
        class="absolute flex flex-col justify-center items-center bottom-3 sm:bottom-4 md:bottom-6 left-3 sm:left-4 md:left-6 bg-[#1a1a1a] border border-[#3a3a3a] rounded-full p-2 sm:p-3"
        class:hidden={ui.tool === "eraser"}
        class:color-picker-hidden={paletteClosing}
      >
        {#each swatches as swatch (swatch.id)}
          <div
            id="whiteboard-color-{swatch.id}"
            class="size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 m-1 sm:m-1.5 md:m-2 rounded-full border-2 cursor-pointer {swatch.classes}"
            class:hidden={!paletteOpen && ui.color !== swatch.index}
            class:border-4={pickedColor === swatch.index}
            role="button"
            tabindex="0"
            aria-label="Use {swatch.id} ink"
            onclick={() => pickColor(swatch.index)}
            onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") pickColor(swatch.index); }}
          ></div>
        {/each}
        <div
          id="whiteboard-color-close"
          class="size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 m-1 sm:m-1.5 md:m-2 flex justify-center items-center text-center rounded-full border-2 border-[#3a3a3a] bg-[#2a2a2a] cursor-pointer"
          class:hidden={!paletteOpen}
          role="button"
          tabindex="0"
          aria-label="Collapse colour picker"
          onclick={collapsePalette}
          onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") collapsePalette(); }}
        >
          <i class="fa fa-close text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-red-500"></i>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* `.hidden` and `.flex` are both display utilities; an id-scoped rule keeps the
     collapse deterministic regardless of their order in the generated sheet. */
  #whiteboard-color-close.hidden,
  #whiteboard-color-config.hidden {
    display: none;
  }
</style>
