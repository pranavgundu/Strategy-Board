<script lang="ts">
  import Modal from "./Modal.svelte";
  import Icon from "./Icon.svelte";
  import type { Contributor } from "./types";

  let {
    open,
    loading = false,
    error = false,
    contributors = [],
    teams = [],
    donators = [],
    onRetry,
    onClose,
  }: {
    open: boolean;
    loading?: boolean;
    error?: boolean;
    contributors?: Contributor[];
    teams?: string[];
    donators?: Contributor[];
    onRetry: () => void;
    onClose: () => void;
  } = $props();
</script>

<Modal {open} onClose={onClose} maxWidth="max-w-6xl">
  <div class="w-full px-6 py-4 flex justify-between items-center bg-[#111111] border-b border-[#1e1e1e]">
    <h2 class="text-base text-[#e8e8e8] font-semibold">Contributors</h2>
    <button
      class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
      onclick={onClose}
      aria-label="Close"
    >
      <Icon name="times" class="w-4 h-4" />
    </button>
  </div>

  <div class="w-full flex-1 overflow-y-auto scroll-momentum p-6 max-[768px]:p-4">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-full">
        <div class="w-10 h-10 rounded-full border-4 border-slate-400/25 border-t-[#888] animate-spin mb-4"></div>
        <p class="text-[#666] text-base">Loading contributors...</p>
      </div>
    {:else if error}
      <div class="flex flex-col items-center justify-center h-full">
        <p class="text-[#ef4444] text-base mb-4">Failed to load contributors</p>
        <button class="px-6 py-3 btn-secondary" onclick={onRetry}>Retry</button>
      </div>
    {:else}
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each contributors as c (c.login)}
            <a
              href={c.html_url}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3 hover:bg-[#1a1a1a] transition-colors"
            >
              <img src={c.avatar_url} alt={c.login} class="w-12 h-12 rounded-full" />
              <div class="min-w-0">
                <div class="text-[#e8e8e8] font-semibold truncate">{c.name || c.login}</div>
                <div class="text-[#666] text-xs">{c.contributions} contributions</div>
              </div>
            </a>
          {/each}
        </div>

        {#if teams.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each teams as team (team)}
              <div class="flex items-center justify-center bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3 text-[#e8e8e8]">
                Team {team}
              </div>
            {/each}
          </div>
        {/if}

        <h3 class="text-base text-[#e8e8e8] font-semibold pt-4">Donators</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each donators as d (d.login)}
            <a
              href={d.html_url}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3 hover:bg-[#1a1a1a] transition-colors"
            >
              <img src={d.avatar_url} alt={d.login} class="w-12 h-12 rounded-full" />
              <div class="min-w-0">
                <div class="text-[#e8e8e8] font-semibold truncate">{d.name || d.login}</div>
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Modal>
