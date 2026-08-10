<script lang="ts">
  import { tick, type Snippet } from "svelte";

  let {
    open,
    id,
    panelId,
    panelClass,
    layer = "z-50",
    title,
    dismissible = true,
    onClose,
    children,
  }: {
    open: boolean;
    /** Backdrop id — several backdrops are targeted by id in app.css. */
    id?: string;
    /** Panel id — `#*-inner-container` rules in app.css scale these panels up. */
    panelId?: string;
    panelClass: string;
    layer?: string;
    title?: string;
    dismissible?: boolean;
    onClose: () => void;
    children: Snippet;
  } = $props();

  let panel = $state<HTMLDivElement>();

  $effect(() => {
    if (open) tick().then(() => panel?.focus());
  });

  function keydown(event: KeyboardEvent) {
    if (open && dismissible && event.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={keydown} />

{#if open}
  <div
    {id}
    class="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none {layer}"
    role="presentation"
    onclick={(event) => dismissible && event.target === event.currentTarget && onClose()}
  >
    <div
      bind:this={panel}
      id={panelId}
      class={panelClass}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
    >
      {@render children()}
    </div>
  </div>
{/if}
