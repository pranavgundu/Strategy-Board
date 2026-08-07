<script lang="ts">
  import Icon from "./Icon.svelte";

  let {
    open,
    title = "New update available",
    message = "We shipped a new release with fixes and improvements.",
    releaseUrl,
    onDismiss,
    onClose,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    releaseUrl?: string;
    onDismiss: () => void;
    onClose: () => void;
  } = $props();
</script>

{#if open}
  <div
    class="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-xs touch-none"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      class="flex flex-col items-center justify-between w-full max-w-md bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
    >
      <div
        class="w-full pt-5 pb-4 px-6 bg-[#111111] border-b border-[#1e1e1e] flex items-center justify-between gap-3"
      >
        <h2 class="text-base text-[#e8e8e8] font-semibold">{title}</h2>
        <button
          class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
          onclick={onClose}
          aria-label="Close"
        >
          <Icon name="times" class="w-4 h-4" />
        </button>
      </div>
      <div class="w-full p-6">
        <p class="text-[#b0b0b0] text-sm sm:text-base leading-relaxed">{message}</p>
      </div>
      <div class="flex w-full">
        <button
          class="w-1/2 text-center text-sm btn-danger p-4 border-t border-[#1e1e1e] rounded-none rounded-bl-[6px]"
          onclick={onDismiss}
        >
          Dismiss
        </button>
        <a
          href={releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-l border-l-[#1e1e1e] border-[#1e1e1e] rounded-none rounded-br-[6px]"
        >
          View release notes
        </a>
      </div>
    </div>
  </div>
{/if}
