<script lang="ts">
  import Modal from "./Modal.svelte";
  import { invalidateContributorsCache, loadContributors, loadContributorTeams } from "$lib/features";
  import type { Contributor } from "$lib/native/types";

  let { open, onClose }: { open: boolean; onClose: () => void } = $props();

  const DONATORS = [{ name: "John Finnegan" }];

  let contributors = $state<Contributor[]>([]);
  let teams = $state<string[]>([]);
  let loading = $state(false);
  let failed = $state(false);
  let revision = $state(0);

  $effect(() => {
    if (!open) return;
    const current = revision;
    loading = true;
    failed = false;
    void Promise.all([loadContributors(), loadContributorTeams()]).then(
      ([people, listedTeams]) => {
        if (current !== revision) return;
        contributors = people;
        teams = listedTeams;
        loading = false;
      },
      () => {
        if (current !== revision) return;
        failed = true;
        loading = false;
      },
    );
  });

  function retry() {
    invalidateContributorsCache();
    revision += 1;
  }

  const cardClass = "flex items-center gap-4 p-4 bg-[#141414] border border-[#1e1e1e] rounded-[6px] hover:bg-[#1a1a1a] transition-colors duration-200 cursor-pointer no-underline";
  const teamCardClass = "flex items-center justify-center p-4 bg-[#141414] border border-[#1e1e1e] rounded-[6px] hover:bg-[#1a1a1a] transition-colors duration-200 cursor-default";
  const donatorStyle = "background: linear-gradient(145deg, #d4a44a, #b8860b, #d4a44a, #f0d68a, #d4a44a); background-size: 300% 100%; border: 3px solid #f0d68a; box-shadow: inset 0 2px 4px rgba(255,248,220,0.4), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4); transition: background-position 0.8s ease; background-position: 0% 0%;";
</script>

<Modal
  {open}
  id="contributors-container"
  panelId="contributors-inner-container"
  title="Contributors"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/4 max-w-6xl bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-[90vh] overflow-hidden"
  {onClose}
>
  <div class="w-full px-6 py-4 flex justify-between items-center bg-[#111111] border-b border-[#1e1e1e]">
    <h2 class="text-base text-[#e8e8e8] font-semibold">Contributors</h2>
    <button
      id="contributors-close-btn"
      class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
      onclick={onClose}
      aria-label="Close contributors"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>

  <div id="contributors-content" class="w-full flex-1 overflow-y-auto p-6">
    {#if loading}
      <div id="contributors-loading" class="flex flex-col items-center justify-center h-full">
        <div class="loading-spinner mb-4"></div>
        <p class="text-[#666] text-base">Loading contributors...</p>
      </div>
    {:else if failed}
      <div id="contributors-error" class="flex flex-col items-center justify-center h-full">
        <p class="text-[#ef4444] text-base mb-4">Failed to load contributors</p>
        <button id="contributors-retry-btn" class="px-6 py-3 btn-secondary" onclick={retry}>Retry</button>
      </div>
    {:else}
      <div id="contributors-list" class="space-y-6">
        <div id="contributors-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each contributors as contributor (contributor.login)}
            <a href={contributor.html_url} target="_blank" rel="noopener noreferrer" class={cardClass}>
              <div class="shrink-0 relative">
                <img
                  src="{contributor.avatar_url}?s=128"
                  alt={contributor.login}
                  class="w-16 h-16 rounded-full border-2 border-[#2a2a2a]"
                  style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; backface-visibility: hidden; transform: translateZ(0); will-change: transform;"
                />
              </div>
              <div class="grow min-w-0">
                <div class="contributor-name text-lg font-bold text-[#e8e8e8] truncate">{contributor.name || contributor.login}</div>
                <p class="text-sm text-[#666] truncate">@{contributor.login}</p>
                {#if contributor.bio}<p class="text-sm text-[#999] mt-1 line-clamp-2">{contributor.bio}</p>{/if}
              </div>
            </a>
          {/each}
        </div>
        <div id="teams-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each teams as team (team)}
            <div class={teamCardClass}>
              <div class="text-center">
                <div class="text-lg font-bold text-[#e8e8e8]">Team {team}</div>
              </div>
            </div>
          {/each}
        </div>

        <h3 class="text-base text-[#e8e8e8] font-semibold pt-4">Donators</h3>
        <div id="donators-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each DONATORS as donator (donator.name)}
            <div class="donator-card flex flex-col items-center justify-center p-6 rounded-[6px] transition-all duration-300 cursor-default relative overflow-hidden" style={donatorStyle}>
              <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px);"></div>
              <div class="relative text-center">
                <div class="text-xl font-bold text-white tracking-wide">{donator.name}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Modal>

<style>
  /* Replaces the original mouseenter/mouseleave handlers that shifted these on hover. */
  :global(.contributor-name) {
    transition: color 200ms;
  }
  :global(a:hover > div > .contributor-name) {
    color: #aaa;
  }
  .donator-card:hover {
    background-position: 100% 0% !important;
  }
</style>
