<script lang="ts">
  let { onNew, onTba, onImportQr, onImportLink, onClear }: { onNew: () => void; onTba: () => void; onImportQr: () => void; onImportLink: () => void; onClear: () => void } = $props();
</script>

<header class="home-toolbar">
  <button class="brand" onclick={() => location.reload()} aria-label="Reload Strategy Board">
    <img class="brand-mark" src="/icon-512.png" alt="" />
    <span class="brand-copy"><strong>Strategy Board</strong><small>FRC strategy workspace</small></span>
  </button>
  <nav aria-label="Match actions" class="toolbar-actions">
    <button class="button primary" onclick={onNew}><span class="button-glyph" aria-hidden="true">＋</span>New match</button>
    <button class="button" onclick={onTba}><span class="button-glyph tba-glyph" aria-hidden="true">TBA</span>Import</button>
    <button class="button compact-label" onclick={onImportQr}><span class="button-glyph" aria-hidden="true">⌗</span><span>Scan QR</span></button>
    <button class="button compact-label" onclick={onImportLink}><span class="button-glyph" aria-hidden="true">↗</span><span>Open link</span></button>
    <button class="button danger subtle-danger" onclick={onClear} title="Clear all saved matches"><span class="button-glyph" aria-hidden="true">⌫</span><span class="clear-label">Clear</span></button>
  </nav>
</header>
