<script lang="ts">
  import { tick, type Snippet } from "svelte";

  let { open, title, dismissible = true, onClose, children }: { open: boolean; title?: string; dismissible?: boolean; onClose: () => void; children: Snippet } = $props();
  let panel = $state<HTMLDivElement>();

  $effect(() => {
    if (open) tick().then(() => panel?.focus());
  });

  function keydown(event: KeyboardEvent) {
    if (dismissible && event.key === "Escape") onClose();
  }
</script>

{#if open}
  <div class="modal-backdrop" role="presentation" onclick={(event) => dismissible && event.target === event.currentTarget && onClose()} onkeydown={keydown}>
    <div bind:this={panel} class="modal-panel" role="dialog" aria-modal="true" aria-label={title} tabindex="-1">
      {#if dismissible}<button class="modal-close" type="button" onclick={onClose} aria-label={`Close ${title || "dialog"}`}>×</button>{/if}
      {@render children()}
    </div>
  </div>
{/if}
