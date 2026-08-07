<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { StatboticsAllianceTeam, StatboticsData } from "./types";

  let {
    available,
    loading = false,
    data = null,
  }: {
    available: boolean;
    loading?: boolean;
    data?: StatboticsData | null;
  } = $props();

  let selectedTeam = $state<StatboticsAllianceTeam | null>(null);

  function showEpa(team: StatboticsAllianceTeam) {
    selectedTeam = team;
  }

  function closeEpa() {
    selectedTeam = null;
  }
</script>

<!--
  IMPORTANT: `$lib/whiteboard.ts` toggles this container's `.hidden` class
  directly (toggleMode swaps between the canvas and this panel when mode ===
  "statbotics"). It must stay permanently mounted with this exact id; do not
  wrap it in an {#if}. Default state matches the legacy markup: hidden.
-->
<div
  id="whiteboard-statbotics-container"
  class="hidden w-full flex-1 min-h-0 m-0 p-0 bg-[#0d0d0d] flex-col overflow-y-auto overflow-x-hidden"
>
  {#if !available}
    <div class="flex flex-col items-center justify-center h-full p-4 md:p-8">
      <Icon name="chart-line" class="w-16 h-16 text-[#999] mb-4" />
      <h2 class="text-2xl font-bold text-[#e8e8e8] mb-2">Stats Data Not Available</h2>
      <p class="text-[#666] text-center max-w-md">
        This match was not imported from The Blue Alliance. Stats analytics are only available for TBA-imported matches.
      </p>
    </div>
  {:else if loading || !data}
    <div class="flex flex-col items-center justify-center h-full p-4 md:p-8">
      <div class="flex flex-col items-center">
        <div class="relative w-16 h-16 mb-4">
          <div class="absolute inset-0 border-4 border-[#222] rounded-full"></div>
          <div class="absolute inset-0 border-4 border-[#888] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 class="text-xl font-bold text-[#e8e8e8] mb-2">Loading Stats...</h2>
        <p class="text-[#666] text-center">Fetching data from Statbotics</p>
      </div>
    </div>
  {:else}
    <div class="flex flex-col p-4 md:p-8">
      {#if data.lastUpdated}
        <p class="text-xs text-[#666] text-right mb-2">{data.lastUpdated}</p>
      {/if}

      <div class="bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 md:p-6 mb-4">
        <h3 class="text-xl md:text-2xl font-bold text-[#e8e8e8] mb-3 text-center">Win Probability</h3>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-red-400 font-bold text-lg w-14">Red</span>
          <div class="flex-1 flex h-6 rounded-full overflow-hidden">
            <div class="bg-red-500 transition-all duration-500" style="width: {data.redWinProb}%"></div>
            <div class="bg-blue-500 transition-all duration-500" style="width: {data.blueWinProb}%"></div>
          </div>
          <span class="text-blue-400 font-bold text-lg w-14 text-right">Blue</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-red-400 text-xl font-bold">{data.redWinProb}%</span>
          <span class="text-blue-400 text-xl font-bold">{data.blueWinProb}%</span>
        </div>
        {#if data.matchResult}
          <div class="text-center mt-3 pt-3 border-t border-[#1e1e1e]">
            <span class="text-sm md:text-base font-semibold text-[#999]">{data.matchResult}</span>
          </div>
        {/if}
      </div>

      <div class="bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 md:p-6 mb-4">
        <h3 class="text-xl md:text-2xl font-bold text-[#c97070] mb-3">Red Alliance</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {#each data.red as team (team.number)}
            <button
              class="team-card bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors text-left"
              onclick={() => showEpa(team)}
            >
              <div class="text-[#e8e8e8] text-base font-semibold mb-1">Team {team.number}</div>
              <div class="text-[#c97070] text-2xl font-bold">{team.epa}</div>
            </button>
          {/each}
        </div>
      </div>

      <div class="bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 md:p-6 mb-4">
        <h3 class="text-xl md:text-2xl font-bold text-[#6090c9] mb-3">Blue Alliance</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {#each data.blue as team (team.number)}
            <button
              class="team-card bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors text-left"
              onclick={() => showEpa(team)}
            >
              <div class="text-[#e8e8e8] text-base font-semibold mb-1">Team {team.number}</div>
              <div class="text-[#6090c9] text-2xl font-bold">{team.epa}</div>
            </button>
          {/each}
        </div>
      </div>

      {#if selectedTeam}
        <div
          class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="presentation"
          onclick={(e) => e.target === e.currentTarget && closeEpa()}
        >
          <div class="epa-modal bg-[#141414] rounded-[6px] p-6 max-w-md w-full border border-[#1e1e1e]">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-[#e8e8e8]">Team {selectedTeam.number} Stats</h3>
              <button
                class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
                onclick={closeEpa}
                aria-label="Close"
              >
                <Icon name="times" class="w-4 h-4" />
              </button>
            </div>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-[#999]">Total EPA:</span>
                <span class="text-white font-bold">{selectedTeam.epa}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#999]">Auto Points:</span>
                <span class="text-white font-bold">{selectedTeam.auto}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#999]">Teleop Points:</span>
                <span class="text-white font-bold">{selectedTeam.teleop}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#999]">Endgame Points:</span>
                <span class="text-white font-bold">{selectedTeam.endgame}</span>
              </div>
              <div class="flex justify-between pt-2 border-t border-[#1e1e1e]">
                <span class="text-[#999]">Rank:</span>
                <span class="text-white font-bold">{selectedTeam.rank}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#999]">Percentile:</span>
                <span class="text-white font-bold">{selectedTeam.percentile}</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .team-card {
    transition: all 0.2s ease;
  }
  .team-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  .epa-modal {
    animation: epa-modal-in 0.1s ease-out;
  }
  @keyframes epa-modal-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
