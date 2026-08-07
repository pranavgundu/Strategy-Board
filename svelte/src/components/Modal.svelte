<script lang="ts">
  import type { Snippet } from "svelte";

  // Shared modal shell: full-screen backdrop + centered panel.
  // Replaces the old absolute/translate/scale hack (see CSS notes) with a
  // panel that is sized properly in markup and never overflows the
  // viewport unscrollably.
  let {
    open,
    onClose,
    maxWidth = "max-w-2xl",
    labelledby,
    children,
  }: {
    open: boolean;
    onClose?: () => void;
    maxWidth?: string;
    labelledby?: string;
    children: Snippet;
  } = $props();

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose?.();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs touch-none overscroll-none"
    role="presentation"
    onclick={onBackdropClick}
    onkeydown={onKeydown}
  >
    <div
      class="flex flex-col items-stretch w-full {maxWidth} max-h-[90dvh] bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledby}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      {@render children()}
    </div>
  </div>
{/if}
