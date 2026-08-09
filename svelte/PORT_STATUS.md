# Svelte Port Status

Snapshot of what's been ported into `svelte/` from the vanilla-TS app in `src/`,
what hasn't, and the one integration problem that blocks this from being more
than a shell. Written by the agent that owns the scaffold + logic/state layer
(`svelte/package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`,
`index.html`, `src/main.ts`, `src/lib/**`). UI components (`src/App.svelte`,
`src/components/**`, `src/app.css`) are owned by a different agent - see their
work for current status on that side.

## What's ported

Framework-agnostic modules, copied from `src/` into `svelte/src/lib/` with
import paths adapted only (directory layout mirrors `src/` 1:1, so most
imports needed no changes at all). No logic was rewritten; behavior is
intended to be identical unless called out below.

| File | Notes |
|---|---|
| `lib/config.ts` | verbatim |
| `lib/db.ts` | verbatim |
| `lib/match.ts` | verbatim |
| `lib/model.ts` | `alert()` calls (IndexedDB load failure, x2) now route through `toast.show(msg, "error")` instead of blocking |
| `lib/manager.ts` | verbatim; `lib/images/2025.png`, `2026.png` copied alongside it |
| `lib/search.ts` | verbatim |
| `lib/tba.ts` | verbatim |
| `lib/statbotics.ts` | verbatim |
| `lib/cloud.ts` | verbatim |
| `lib/contributors.ts` | verbatim |
| `lib/tauri.ts` | verbatim |
| `lib/wasm/index.ts` + `lib/wasm/pkg/**` | verbatim; `pkg/` (wasm-pack output) copied wholesale from `src/wasm/pkg/` |
| `lib/whiteboard.ts` | copied as-is per instructions, imports only adapted - see "The whiteboard.ts problem" below, this is NOT a clean port |

New state layer (Svelte 5 runes, not a port of any single `src/` file - see
each store's file for the exact contract):

- `lib/stores/app.svelte.ts` - screen/matches/activeMatch/loading + CRUD
- `lib/stores/board.svelte.ts` - toolbar UI state (mode/tool/color/undo) -
  **not wired to a live Whiteboard instance yet**, see below
- `lib/stores/toast.svelte.ts` - replaces the app's blocking `alert()` calls

## What's NOT ported

- `src/view.ts` (~3279 lines) - being replaced by Svelte components, not ported at all
- `src/qr.ts` (~664 lines) - QR export/import (camera scanning), not started
- `src/pdf.ts` (~142 lines) - PDF export of whiteboard snapshots, not started
- `src/app.ts` (~118 lines) - old entry point (PWA registration, Vercel analytics,
  `roundRect` polyfill, module orchestration). `svelte/src/main.ts` is a minimal
  replacement that only mounts `App.svelte` - none of app.ts's startup logic
  (SW registration, analytics injection, polyfill) has been carried over yet
- The 336 Vitest tests in `tests/` - none adapted for the svelte/ tree; the
  ported lib/ modules currently have zero test coverage in this new tree

## The whiteboard.ts problem

The task instruction was "copy whiteboard.ts as-is, Svelte adds nothing to
imperative canvas code, adapt only imports." That instruction undersold the
coupling. `svelte/src/lib/whiteboard.ts` is not a canvas renderer with a
few DOM listeners bolted on - **148 `getElementById`/`querySelector` calls**
make it the entire whiteboard UI controller (toolbar, color picker, draw
config, number pad) fused directly to the rendering code, all bound once
inside the constructor.

The 22 unique fixed element IDs it depends on:

```
whiteboard-wrapper
whiteboard-canvas-background
whiteboard-canvas-items
whiteboard-canvas-drawing
whiteboard-toolbar-mode-auto
whiteboard-toolbar-mode-teleop
whiteboard-toolbar-mode-transition
whiteboard-toolbar-mode-endgame
whiteboard-toolbar-mode-notes
whiteboard-toolbar-mode-statbotics
whiteboard-toolbar-undo
whiteboard-toolbar-redo
whiteboard-color-config
whiteboard-color-white
whiteboard-color-red
whiteboard-color-blue
whiteboard-color-green
whiteboard-color-yellow
whiteboard-color-close
whiteboard-draw-config
whiteboard-draw-config-marker
whiteboard-draw-config-eraser
whiteboard-draw-config-checkbox
whiteboard-draw-config-text
whiteboard-number-pad
```

Two consequences the UI-component agent needs to know, not optional:

1. **Element IDs must be preserved verbatim.** Whatever component renders
   the whiteboard screen must emit DOM elements with exactly these IDs
   (canvas elements plus every toolbar/color/draw-config/number-pad node
   Whiteboard binds to). Renaming or restructuring them silently breaks
   the controller - there is no error, the listeners just never attach.

2. **That subtree must never be conditionally rendered/destroyed.**
   `Whiteboard` looks up every element and binds every listener exactly
   once, inside its constructor (`svelte/src/lib/whiteboard.ts:316` on).
   If the mounting component wraps the whiteboard markup in an `{#if}`
   (e.g. toggling between "home" and "whiteboard" screens the way
   `app.screen` suggests), Svelte will destroy and later recreate those
   DOM nodes on screen changes, but `Whiteboard` has no re-bind path - a
   new `Whiteboard` instance would need to be constructed against the new
   nodes every time, or the nodes must be kept alive (e.g. `display: none`
   instead of `{#if}`/`{#key}`) so the original constructor's bindings stay
   valid across screen toggles. Toggling home -> whiteboard -> home ->
   whiteboard today, with a naive `{#if app.screen === 'whiteboard'}`,
   will render a whiteboard whose toolbar buttons no longer do anything
   after the first round-trip, with no console error.

## The board store gap

`lib/stores/board.svelte.ts` exports `mode`/`tool`/`color`/`canUndo` and
`setMode`/`setTool`/`setColor`/`undo`/`clear` per the frozen contract, but
in this increment they are a **self-contained reactive store, deliberately
not wired to the live `Whiteboard` instance**. Reasoning: `Whiteboard`
already owns `mode`/`currentTool`/`currentColor`/undo history as private
fields, mutated only through its own DOM event handlers on the fixed IDs
above. Driving those same fields through `board.svelte.ts` as well - without
a real integration - would create two sources of truth that can silently
diverge (e.g. a Svelte-rendered toolbar showing "auto" selected while
`Whiteboard`'s internal `this.mode` is actually "teleop" because a keyboard
shortcut or the legacy click handler changed it without telling the store).
Rather than build a fake integration that looks wired up but isn't, this
increment ships `board` as an honest, isolated UI-state container plus two
non-contract escape hatches (`board._bind({undo, clear})`,
`board.setCanUndo(v)`) for whoever does the real integration to use.

Until that integration exists: `board.undo()`/`board.clear()` are no-ops
unless something calls `_bind()`, and `board.canUndo` stays `false` unless
something calls `setCanUndo()`. Nothing currently calls either.

## Recommended next task

Extract `whiteboard.ts`'s DOM binding into a real public API instead of
constructor-time `getElementById` calls:

- Constructor takes canvas refs directly (three `HTMLCanvasElement`
  references) instead of discovering them via fixed IDs
- Public methods: `setMode(mode)`, `setTool(tool)`, `setColor(color)`,
  `undo()`, `clear()`
- A way to observe undo-availability reactively, e.g.
  `onUndoAvailabilityChange(cb: (canUndo: boolean) => void)`, so
  `board.svelte.ts` can forward it into `canUndo` instead of needing manual
  `setCanUndo()` calls

That refactor is a prerequisite for `board.svelte.ts` to become the single
source of truth it currently only pretends to be room for. Until it happens,
the toolbar UI has to be built either against the legacy fixed-ID DOM
contract directly (bypassing `board` for anything beyond passive display) or
against `board` with the understanding that it doesn't yet drive the actual
canvas.

## Verification (as of last run)

```
bun install          -> clean, 141 packages
bunx tsc --noEmit     -> exit 0, zero errors
bun run build         -> fails: Could not resolve './App.svelte' in src/main.ts
```

The build failure is expected and outside this agent's ownership - `App.svelte`
and `app.css` (owned by the UI-component agent) don't exist yet. The lib/
layer itself was independently verified to bundle correctly (WASM asset,
images, all ported modules, all three stores, and `Whiteboard` together) by
temporarily pointing `index.html` at a throwaway entry file that imported
everything in `lib/`, running a real `vite build` against it, confirming a
clean bundle, then deleting the throwaway file and restoring `index.html`.
