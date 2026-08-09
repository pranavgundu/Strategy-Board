# Port notes: whiteboard DOM binding

`src/whiteboard.ts` (destined for `$lib/whiteboard.ts`) is not a
self-contained canvas renderer. Its constructor makes roughly 148
`getElementById`/`querySelector` calls across the *entire* whiteboard UI,
not just the three `<canvas>` elements, and binds click listeners to those
elements exactly once, directly:

- `whiteboard-wrapper`
- `whiteboard-toolbar-undo`, `whiteboard-toolbar-redo`
- `whiteboard-toolbar-mode-{auto,teleop,transition,endgame,notes,statbotics}`
- `whiteboard-color-{yellow,green,blue,red,white,close}`, `whiteboard-color-config`
- `whiteboard-draw-config`, `whiteboard-draw-config-{marker,eraser,checkbox,text}`
  (`text` is optional-chained in `whiteboard.ts` and had no markup anywhere in
  the original app either - unfinished "text" tool - rendered here anyway,
  hidden, so the id exists per the 22-id list in `svelte/PORT_STATUS.md`)
- `whiteboard-number-pad` (currently only hidden/shown; no digit click
  handlers exist yet - this UI has no markup at all in the current
  `index.html`, it's unfinished scaffolding)

Because of this, the components under `svelte/src/components/` that make up
the whiteboard screen (`WhiteboardScreen.svelte`, `WhiteboardToolbar.svelte`,
`ColorPicker.svelte`, `DrawConfig.svelte`, `NumberPad.svelte`) follow three
rules for this increment:

1. **IDs are preserved verbatim.** Every element `whiteboard.ts` looks up by
   id exists in the rendered markup with that exact id.
2. **The whiteboard subtree is mounted once, permanently.** `#whiteboard-container`
   (and `#home-container`) are always in the DOM; visibility is toggled with
   the `hidden` class (`class:hidden={app.screen !== 'whiteboard'}`), never
   with `{#if}`. Conditionally rendering would destroy and recreate the
   nodes on every screen switch, and `whiteboard.ts` only binds its
   listeners on construction - the toolbar would go dead after the first
   toggle.
3. **Mode, undo/redo, tool, and color are NOT driven by the board store.**
   `whiteboard.ts` owns that state privately (`this.mode`, `this.currentTool`,
   `this.currentColor`, `this.autoActionHistory`/etc.) and mutates the DOM
   directly (`classList`, `style.display`, `style.opacity`) in response to
   its own click listeners on the ids above. Wiring `board.setMode()` etc.
   from Svelte `onclick` handlers on the same elements would create two
   independent sources of truth that silently diverge. For this increment
   the legacy listeners win; the Svelte components only own things
   `whiteboard.ts` does not touch (EXIT -> `app.closeMatch()`, TOGGLE VIEW ->
   the mounted instance's `toggleView()`).

One consequence: two small CSS rules keep their pre-port form instead of
becoming store-driven state classes, because there is no store to drive them
from yet:

- `DrawConfig.svelte`: `.tool-icon[style*="display: none"]` (the marker/
  eraser/checkbox pop transition) still reacts to the inline `style.display`
  that `whiteboard.ts` writes directly.
- `WhiteboardToolbar.svelte`: `#whiteboard-toolbar-undo[style*="opacity: 0.5"]`
  still reacts to the inline `style.opacity` that `updateUndoRedoButtons()`
  writes directly.

## Bonus blocker found while doing this: Whiteboard cannot actually be mounted yet

Confirmed against the real `svelte/src/lib/whiteboard.ts` and
`svelte/src/lib/stores/app.svelte.ts` (both exist as of this pass):

- `Whiteboard`'s constructor takes a `Model` instance
  (`whiteboard.ts:316`, `constructor(model: Model)`); a match is then
  attached separately via the public `setMatch(match: Match)` method
  (`whiteboard.ts:893`). It does not take a `Match` directly.
- `app.svelte.ts` constructs its own `Model` in a module-private
  `const model = new Model()` and does not export it - only derived
  snapshots (`app.matches`, `app.activeMatch`) are exported.

There is currently no supported way for `WhiteboardScreen.svelte` to
construct a real `Whiteboard`: doing `new Model()` locally in the component
would read/write IndexedDB through a second, independent `Model` instance
that silently diverges from `app`'s. Rather than fake that wiring,
`WhiteboardScreen.svelte`'s mount effect is a documented no-op (dev-mode
console warning only) until `app.svelte.ts` exposes its model - or,
better, until `Whiteboard` is refactored (see below) to not need one at
construction time. This mirrors `svelte/PORT_STATUS.md`'s own conclusion
about the `board` store's `_bind()`/`setCanUndo()` escape hatches being
unconnected for the same underlying reason.

## Follow-up (next task, not done here)

`whiteboard.ts` needs its DOM-binding extracted into a public API - e.g.
`mount(elements: {...refs}, callbacks: {...})` / exposed reactive getters for
`mode`/`tool`/`color`/`canUndo` - before the toolbar can become genuinely
reactive (single source of truth in `board.svelte.ts`, Svelte owning
`onclick`, real state classes instead of inline-style attribute selectors).
Until that refactor lands, treat the whiteboard screen's interactive chrome
as owned by the legacy engine, not by Svelte.

## Also fixed while addressing this

- `board.mode` is a 6-value union (`auto | teleop | transition | endgame |
  notes | statbotics`), not 4 - `transition` is a real phase
  (`src/match.ts`, serialized as `tr`) and `statbotics` is a view mode that
  swaps the canvas for the stats panel. `WhiteboardToolbar.svelte` renders
  all six mode buttons (matching `index.html`, `transition` and `statbotics`
  still carry the `hidden` class as they did originally - that's existing
  product behavior, not something this port changed).
