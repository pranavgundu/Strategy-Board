<script lang="ts">
  import { tick } from "svelte";
  import { app } from "$lib/stores/app.svelte";
  import { createWhiteboardController, whiteboardMatchFromPacket, writeWhiteboardPacket, type WhiteboardController, type WhiteboardMatch, type WhiteboardMode, type WhiteboardState } from "$lib/whiteboard";
  import { safeFilename, savePng } from "$lib/features";
  import StatboticsPanel from "./StatboticsPanel.svelte";

  let { pngRequest = 0, onNotice = () => {} }: { pngRequest?: number; onNotice?: (message: string) => void } = $props();
  const modes: Array<{ id: WhiteboardMode; label: string }> = [
    { id: "auto", label: "Auto" }, { id: "teleop", label: "Teleop" }, { id: "transition", label: "Transition" },
    { id: "endgame", label: "Endgame" }, { id: "notes", label: "Notes" },
  ];
  const colors = ["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"];
  let container = $state<HTMLDivElement>();
  let background = $state<HTMLCanvasElement>();
  let items = $state<HTMLCanvasElement>();
  let drawing = $state<HTMLCanvasElement>();
  let controller = $state<WhiteboardController | null>(null);
  let ui = $state<WhiteboardState>({ mode: "auto", tool: "marker", color: 0, view: "full", canUndo: false, canRedo: false, isCanvasVisible: true });
  let loadedMatchId = "";
  let commitQueue: Promise<void> = Promise.resolve();
  let handledPngRequest = 0;

  function controllerState(next: WhiteboardState) { ui = next; }

  function queueCommit(match: WhiteboardMatch) {
    const source = app.activeMatch;
    if (!source || source.id !== match.id) return;
    const packet = writeWhiteboardPacket(source.packet, match);
    commitQueue = commitQueue.then(() => app.commitPacket(packet)).catch(() => onNotice("Could not save the latest whiteboard change."));
  }

  $effect(() => {
    if (!container || !background || !items || !drawing || app.screen !== "whiteboard") return;
    const next = createWhiteboardController({ onStateChange: controllerState, onCommit: ({ match }) => queueCommit(match) });
    controller = next;
    const destroy = next.mount({ container, background, items, drawing });
    return () => { destroy(); if (controller === next) controller = null; loadedMatchId = ""; };
  });

  $effect(() => {
    const active = app.activeMatch;
    if (!controller || !active || active.id === loadedMatchId) return;
    loadedMatchId = active.id;
    controller.setMatch(whiteboardMatchFromPacket(active.packet));
  });

  $effect(() => {
    if (!pngRequest || pngRequest === handledPngRequest || !controller) return;
    handledPngRequest = pngRequest;
    tick().then(exportPng);
  });

  function exit() { app.closeMatch(); }
  async function exportPng() {
    const data = controller?.exportPng();
    if (!data) { onNotice("The whiteboard is not ready to export yet."); return; }
    try { const result = await savePng(data, safeFilename(app.activeMatch?.matchName || "strategy-board")); if (result.saved) onNotice("PNG exported."); }
    catch { onNotice("Could not export the PNG."); }
  }
</script>

{#if app.screen === "whiteboard"}
  <section class="whiteboard-screen">
    <header class="whiteboard-toolbar">
      <div class="whiteboard-title"><button class="button back-button" onclick={exit}>← <span>Matches</span></button><strong>{app.activeMatch?.matchName || "Untitled match"}</strong></div>
      <div class="mode-controls" aria-label="Match phase">
        {#each modes as mode}
          <button class:active={ui.mode === mode.id} class="mode-button" onclick={() => controller?.setMode(mode.id)}>{mode.label}</button>
        {/each}
      </div>
      <div class="canvas-controls" aria-label="Whiteboard tools">
        <button class:active={ui.isCanvasVisible} class="button tool-button" onclick={() => controller?.setMode("auto")}>Canvas</button>
        <button class:active={!ui.isCanvasVisible} class="button tool-button" onclick={() => controller?.setMode("statbotics")}>Stats</button>
        <span class="control-divider" aria-hidden="true"></span>
        <button class:active={ui.tool === "marker"} class="button tool-button" onclick={() => controller?.setTool("marker")} aria-label="Marker">✎</button>
        <button class:active={ui.tool === "eraser"} class="button tool-button" onclick={() => controller?.setTool("eraser")} aria-label="Eraser">⌫</button>
        {#if ui.mode === "notes"}<button class:active={ui.tool === "checkbox"} class="button tool-button" onclick={() => controller?.setTool("checkbox")} aria-label="Checkbox">☐</button>{/if}
        <div class="color-controls" aria-label="Marker color">{#each colors as color, index}<button class:active={ui.color === index} class="color-swatch" style={`--swatch:${color}`} aria-label={`Use ${["white", "red", "blue", "green", "yellow"][index]} ink`} onclick={() => controller?.setColor(index)}></button>{/each}</div>
        <span class="control-divider" aria-hidden="true"></span>
        <button class="button tool-button" disabled={!ui.canUndo} onclick={() => controller?.undo()} aria-label="Undo">↶</button><button class="button tool-button" disabled={!ui.canRedo} onclick={() => controller?.redo()} aria-label="Redo">↷</button>
        <button class="button tool-button view-button" onclick={() => controller?.toggleView()}>{ui.view === "full" ? "Full field" : `${ui.view} view`}</button><button class="button primary export-button" onclick={exportPng}>Export PNG</button>
      </div>
    </header>
    <div bind:this={container} class:statbotics-view={!ui.isCanvasVisible} class="whiteboard-canvas" aria-label="Strategy whiteboard">
      <canvas bind:this={background} class="board-canvas" aria-hidden="true"></canvas><canvas bind:this={items} class="board-canvas" aria-label="Match strategy board"></canvas><canvas bind:this={drawing} class="board-canvas" aria-hidden="true"></canvas>
      <StatboticsPanel match={app.activeMatch} visible={!ui.isCanvasVisible} />
    </div>
  </section>
{/if}
