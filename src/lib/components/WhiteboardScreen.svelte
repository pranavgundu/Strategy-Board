<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { app } from "$lib/stores/app.svelte";
  import { boardConfig } from "$lib/stores/config.svelte";
  import { scheduleSync } from "$lib/stores/sync.svelte";
  import { createWhiteboardController, whiteboardMatchFromPacket, writeWhiteboardPacket, type WhiteboardController, type WhiteboardMatch, type WhiteboardMode, type WhiteboardState } from "$lib/whiteboard";
  import { newId, safeFilename, savePng } from "$lib/features";
  import { addCommonPath, carryOverToLineup, commonPathChoices, matchFieldYear, packetLineup, phaseName, readExtras, readTicks, saveCommonPath, STATIONS, swapBenchTeam, toggleTick, type CommonPath, type Lineup, type MatchPhase, type StationKey } from "$lib/domain";
  import { native } from "$lib/native/api";
  import type { MatchPacket } from "$lib/native/types";
  import ApplyCommonPathModal from "./ApplyCommonPathModal.svelte";
  import ChecklistPanel from "./ChecklistPanel.svelte";
  import InkPicker from "./InkPicker.svelte";
  import SaveCommonPathModal from "./SaveCommonPathModal.svelte";
  import StatboticsPanel from "./StatboticsPanel.svelte";

  let { pngRequest = 0, onNotice = () => {} }: { pngRequest?: number; onNotice?: (message: string) => void } = $props();

  let container = $state<HTMLDivElement>();
  let background = $state<HTMLCanvasElement>();
  let items = $state<HTMLCanvasElement>();
  let drawing = $state<HTMLCanvasElement>();
  let controller = $state<WhiteboardController | null>(null);
  let ui = $state<WhiteboardState>({ mode: "auto", tool: "marker", ink: 0, view: "full", canUndo: false, canRedo: false, isCanvasVisible: true, hiddenTeams: [] });
  let fieldYear = $state<number | undefined>(undefined);
  let toolbar = $state<HTMLDivElement>();
  let toolbarLeft = $state<HTMLDivElement>();
  let toolbarModes = $state<HTMLDivElement>();
  let toolbarRight = $state<HTMLDivElement>();
  let toolbarFit = $state<"" | "toolbar-condensed" | "toolbar-ultra">("");

  const CHECKLIST_OPEN_KEY = "checklistPanelOpen";
  let checklistOpen = $state(true);
  let savePathFor = $state<StationKey | null>(null);
  let applyOpen = $state(false);

  let loadedMatchId = "";
  let handledSyncChange = scheduleSync.lastChange.revision;
  let commitQueue: Promise<void> = Promise.resolve();
  let handledPngRequest = 0;

  const lineup = $derived<Lineup | null>(app.activeMatch && packetLineup(app.activeMatch.packet));
  const bench = $derived(app.activeMatch ? readExtras(app.activeMatch.packet).bench ?? {} : {});
  const ticks = $derived(app.activeMatch ? readTicks(app.activeMatch.packet, boardConfig.current.checklist) : []);
  const teleopLabel = $derived(fieldYear === 2026 ? "ACTIVE" : "TELEOP");
  const endgameLabel = $derived(fieldYear === 2026 ? "INACTIVE" : "ENDGAME");
  const phaseOnScreen = $derived<MatchPhase | null>(ui.mode === "statbotics" ? null : ui.mode);
  const pathFieldYear = $derived(app.activeMatch ? matchFieldYear(app.activeMatch.packet) : 2026);
  const pathChoices = $derived(applyOpen && lineup && phaseOnScreen
    ? commonPathChoices(boardConfig.current.commonPaths, { fieldYear: pathFieldYear, phase: phaseOnScreen, lineup })
    : []);
  const savePreview = $derived.by(() => {
    if (!savePathFor || !phaseOnScreen) return null;
    const packet = livePacket();
    return packet ? saveCommonPath(packet, savePathFor, phaseOnScreen, { id: "preview", name: "preview", tag: null }) : null;
  });
  const showTransition = $derived(fieldYear === 2026);
  const showStats = $derived(
    [app.activeMatch?.redOne, app.activeMatch?.redTwo, app.activeMatch?.redThree, app.activeMatch?.blueOne, app.activeMatch?.blueTwo, app.activeMatch?.blueThree]
      .some((team) => team && team.trim() !== ""),
  );

  // each save is worked out from the latest stored packet when its turn comes - so queued changes never undo each other
  function queueCommit(match: WhiteboardMatch) {
    const { id } = match;
    commitQueue = commitQueue.then(() => {
      const source = app.packets.find((packet) => packet[7] === id);
      if (!source) return;
      const scene = writeWhiteboardPacket(source, match);
      const stored = packetLineup(source);
      if (STATIONS.every((station) => stored[station] === match[station])) return app.commitPacket(scene);
      // sync moved the teams after these edits were drawn - carry them over so every stroke stays with its team
      STATIONS.forEach((station, index) => { scene[index + 1] = match[station]; });
      scene[8][0] = STATIONS.map((station) => [match.auto[`${station}Robot`].w, match.auto[`${station}Robot`].h]);
      return app.commitPacket(carryOverToLineup(scene, source));
    }).catch(() => onNotice("Could not save the latest whiteboard change."));
  }

  function toggleItem(itemId: string) {
    const id = app.activeMatch?.id;
    if (!id) return;
    commitQueue = commitQueue.then(() => {
      const source = app.packets.find((packet) => packet[7] === id);
      return source ? app.commitPacket(toggleTick(source, boardConfig.current.checklist, itemId)) : undefined;
    }).catch(() => onNotice("Could not save that tick."));
  }

  function toggleChecklist() {
    checklistOpen = !checklistOpen;
    void native.storage.set(CHECKLIST_OPEN_KEY, checklistOpen).catch(() => undefined);
  }

  onMount(() => {
    void native.storage.get(CHECKLIST_OPEN_KEY).then((stored) => { if (stored === false) checklistOpen = false; }, () => undefined);
  });

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
    controller?.setTeamColorOverrides(boardConfig.current.teamColors);
  });

  $effect(() => {
    const change = scheduleSync.lastChange;
    if (change.revision === handledSyncChange) return;
    handledSyncChange = change.revision;
    untrack(() => {
      const active = app.activeMatch;
      const shown = controller?.getMatch();
      if (!controller || !active || !shown || !change.ids.includes(active.id)) return;
      const next = packetLineup(active.packet);
      controller.reloadMatch(whiteboardMatchFromPacket(active.packet));
      if (STATIONS.some((station) => next[station] !== shown[station])) onNotice("The schedule changed this match's teams. Each plan moved with its team.");
    });
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

  // includes canvas edits still waiting to be saved
  function livePacket(): MatchPacket | null {
    const source = app.activeMatch;
    const scene = controller?.getMatch();
    return source && scene ? writeWhiteboardPacket(source.packet, scene) : null;
  }

  function savePath(details: { name: string; tag: string | null }) {
    const packet = livePacket();
    if (!packet || !savePathFor || !phaseOnScreen) return;
    const path = saveCommonPath(packet, savePathFor, phaseOnScreen, { id: newId(), ...details });
    void boardConfig.update(addCommonPath(boardConfig.current, path));
    savePathFor = null;
    onNotice(`Saved "${path.name}" as a Common Path.`);
  }

  async function swapBench(station: StationKey) {
    await commitQueue;
    const packet = livePacket();
    if (!packet) return;
    try {
      await app.commitPacket(swapBenchTeam(packet, station));
      const active = app.activeMatch;
      if (active) controller?.reloadMatch(whiteboardMatchFromPacket(active.packet));
    } catch {
      onNotice("Could not swap the Bench Team.");
    }
  }

  function applyPath(path: CommonPath, station: StationKey) {
    controller?.pasteCommonPath(path, station);
    applyOpen = false;
  }

  function cycleTool() {
    controller?.toggleTool();
  }

  function exit() { app.closeMatch(); }

  async function exportPng() {
    const data = controller?.exportPng();
    if (!data) { onNotice("The whiteboard is not ready to export yet."); return; }
    try {
      const result = await savePng(data, safeFilename(app.activeMatch?.matchName || "orbit-strategy-board"));
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
        {#if ui.isCanvasVisible}
          <button
            id="whiteboard-toolbar-paths"
            class="text-base md:text-xl font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3"
            onclick={() => (applyOpen = true)}
          >
            PATHS
          </button>
        {/if}
        <button
          id="whiteboard-toolbar-view-toggle"
          class="text-base md:text-xl font-semibold select-none touch-none btn-secondary px-6 py-3 md:px-8 md:py-3"
          onclick={() => controller?.toggleView()}
        >
          TOGGLE VIEW
        </button>
      </div>
    </div>

    <div class="flex flex-1 min-h-0">
      <div class="relative flex flex-col flex-1 min-w-0">
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

          {#if lineup}
            <InkPicker {lineup} ink={ui.ink} overrides={boardConfig.current.teamColors} hiddenTeams={ui.hiddenTeams} onPick={(ink) => controller?.setInk(ink)} onToggleHidden={(team) => controller?.toggleHiddenTeam(team)} onSavePath={(station) => (savePathFor = station)} {bench} onSwapBench={swapBench} />
          {/if}
        {/if}
      </div>
      <ChecklistPanel checklist={boardConfig.current.checklist} {ticks} open={checklistOpen} onToggleOpen={toggleChecklist} onTick={toggleItem} />
    </div>
  </div>

  {#if lineup}
    <SaveCommonPathModal
      open={savePathFor !== null}
      team={savePathFor ? lineup[savePathFor] : ""}
      phaseLabel={phaseOnScreen ? phaseName(phaseOnScreen, pathFieldYear) : ""}
      strokeCount={savePreview?.strokes.length ?? 0}
      onSave={savePath}
      onClose={() => (savePathFor = null)}
    />
    <ApplyCommonPathModal open={applyOpen} choices={pathChoices} {lineup} fieldYear={pathFieldYear} onApply={applyPath} onClose={() => (applyOpen = false)} />
  {/if}
{/if}
