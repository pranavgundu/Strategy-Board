<script lang="ts">
  import { app } from "$lib/stores/app.svelte";
  import WhiteboardToolbar from "./WhiteboardToolbar.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import DrawConfig from "./DrawConfig.svelte";
  import NumberPad from "./NumberPad.svelte";
  import StatboticsPanel from "./StatboticsPanel.svelte";

  import { onMount } from "svelte";
  import { Whiteboard } from "$lib/whiteboard";
  import { board } from "$lib/stores/board.svelte";

  let whiteboard: Whiteboard | null = null;

  onMount(() => {
    whiteboard = new Whiteboard(app.model, { bindLegacyDOM: false });

    const unsubscribe = whiteboard.onChange((s) => board._syncFromEngine(s));

    board._bindEngine(whiteboard);

    return () => {
      unsubscribe();
      board._bindEngine(null);
      whiteboard = null;
    };
  });

  $effect(() => {
    const match = app.activeMatch;
    if (whiteboard && match) whiteboard.setMatch(match);
  });

  function exit() {
    app.closeMatch();
  }

  function toggleView() {
    whiteboard?.toggleView();
  }
</script>

<div
  id="whiteboard-container"
  class="flex flex-col w-full h-full touch-none"
  class:hidden={app.screen !== "whiteboard"}
>
  <WhiteboardToolbar onExit={exit} onToggleView={toggleView} />

  <div id="whiteboard-wrapper" class="w-full flex-1 min-h-0 m-0 p-0 bg-[#0d0d0d]">
    <canvas
      id="whiteboard-canvas-background"
      width="3510"
      height="1610"
      class="absolute m-0 select-none touch-none"
    ></canvas>
    <canvas
      id="whiteboard-canvas-items"
      width="3510"
      height="1610"
      class="absolute m-0 select-none touch-none"
    ></canvas>
    <canvas
      id="whiteboard-canvas-drawing"
      width="3510"
      height="1610"
      class="absolute m-0 select-none touch-none"
    ></canvas>
  </div>

  <StatboticsPanel available={!!app.activeMatch?.tbaMatchKey} />

  <DrawConfig />
  <ColorPicker />
  <NumberPad />
</div>

<style>
  /* `hidden` here is Tailwind's own global utility (toggled by literal
     class add/remove via class:hidden, mirroring the legacy
     classList.add/remove("hidden") pattern) - not redefined locally. */
  #whiteboard-wrapper {
    position: relative;
    overflow: hidden;
    touch-action: none;
    overscroll-behavior: none;
  }
  #whiteboard-canvas-background,
  #whiteboard-canvas-items,
  #whiteboard-canvas-drawing {
    position: absolute;
    top: 0;
    left: 0;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    transform: translateZ(0);
    will-change: transform;
  }
</style>
