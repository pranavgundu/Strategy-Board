<script lang="ts">
  import { loadContributorTeams } from "$lib/features";
  import type { Match } from "./types";

  let { matches, onOpen, onEdit, onDuplicate, onExportPng, onExportQr, onShare, onDelete }: { matches: Match[]; onOpen: (match: Match) => void; onEdit: (match: Match) => void; onDuplicate: (match: Match) => void; onExportPng: (match: Match) => void; onExportQr: (match: Match) => void; onShare: (match: Match) => void; onDelete: (match: Match) => void } = $props();

  const GOLD_TEAM = "834";
  let openId = $state<string | null>(null);
  let contributorTeams = $state<string[]>([]);

  $effect(() => { void loadContributorTeams().then((teams) => (contributorTeams = teams), () => {}); });

  /** Matches the original: team 834 pulses gold, contributor teams cycle rainbow. */
  function animationOf(team: string): "rainbow" | "gold" | "none" {
    if (team === GOLD_TEAM) return "gold";
    if (contributorTeams.includes(team)) return "rainbow";
    return "none";
  }

  // Red is listed right-to-left so the alliances mirror across the "VS" divider.
  const redTeams = (match: Match) => [match.redThree, match.redTwo, match.redOne];
  const blueTeams = (match: Match) => [match.blueOne, match.blueTwo, match.blueThree];

  function open(match: Match) { if (openId !== match.id) onOpen(match); }
  function closeActions(event: FocusEvent) {
    const item = event.currentTarget as HTMLElement;
    if (item.contains(event.relatedTarget as Node)) return;
    openId = null;
  }
  function run(action: (match: Match) => void, match: Match) { openId = null; action(match); }
</script>

{#snippet teamList(teams: string[], baseColor: string)}
  {#each teams as team, teamIndex}{#if teamIndex > 0}{" "}{/if}<span class={baseColor}
    >{#if animationOf(team) === "none"}{team}{:else}{#each team.split("") as digit, digitIndex}<span
          class={animationOf(team) === "rainbow" ? "rainbow-team-digit" : "special-team-digit"}
          style="animation-delay: {digitIndex * 0.3}s;">{digit}</span
        >{/each}{/if}</span
  >{/each}
{/snippet}

<div
  id="home-match-list"
  class="relative w-full p-10 flex-1 flex flex-col gap-3 items-stretch overflow-y-auto bg-[#0d0d0d]"
  class:match-list-actions-open={openId !== null}
>
  {#if matches.length === 0}
    <div id="home-match-list-empty-placeholder" class="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center text-[#999] text-xl pointer-events-none">
      Click
      <span class="not-italic text-[#999] bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1 rounded">New</span>
      to add matches
    </div>
  {/if}
  {#each matches as match (match.id)}
    <div
      class="w-full h-[5.5rem] bg-[#141414] border border-[#1e1e1e] flex shrink-0 justify-between items-center rounded-xl px-10"
      class:match-actions-open={openId === match.id}
      tabindex="0"
      role="button"
      onclick={() => open(match)}
      onkeydown={(event) => { if (event.key === "Enter") open(match); }}
      onfocusout={closeActions}
    >
      <div class="grow-1 basis-0 text-[#e8e8e8] font-semibold text-2xl select-none overflow-hidden text-ellipsis whitespace-nowrap">
        {match.matchName}
      </div>
      <div class="w-1/2 flex justify-center items-center gap-3 sm:gap-5 md:gap-8">
        <div class="w-1/2 text-[#c97070] text-xl text-right select-none overflow-hidden text-ellipsis whitespace-nowrap">
          {@render teamList(redTeams(match), "text-red-400")}
        </div>
        <div class="text-[#999] text-xl select-none">VS</div>
        <div class="w-1/2 text-[#6090c9] text-xl select-none overflow-hidden text-ellipsis whitespace-nowrap">
          {@render teamList(blueTeams(match), "text-blue-400")}
        </div>
      </div>
      <div class="grow-1 basis-0 flex h-full justify-end items-center">
        {#if openId !== match.id}
          <button
            class="match-menu-btn flex flex-col w-14 sm:w-16 md:w-18 gap-2.5 items-center justify-center rounded"
            onclick={(event) => { event.stopPropagation(); openId = match.id; }}
            aria-label={`Actions for ${match.matchName}`}
          >
            <div class="menu-dot w-2.5 h-2.5 rounded-full bg-[#555]"></div>
            <div class="menu-dot w-2.5 h-2.5 rounded-full bg-[#555]"></div>
            <div class="menu-dot w-2.5 h-2.5 rounded-full bg-[#555]"></div>
          </button>
        {:else}
          <div class="flex items-center justify-center gap-3 sm:gap-4" onclick={(event) => event.stopPropagation()} role="presentation">
            <button class="px-5 py-2.5 text-base btn-secondary" onclick={() => run(onEdit, match)}>Edit</button>
            <button class="px-5 py-2.5 text-base btn-secondary" onclick={() => run(onDuplicate, match)}>Duplicate</button>
            <button class="px-5 py-2.5 text-base btn-secondary whitespace-nowrap" onclick={() => run(onExportPng, match)}>Export PNG</button>
            <button class="px-5 py-2.5 text-base btn-secondary whitespace-nowrap" onclick={() => run(onExportQr, match)}>Export QR</button>
            <button class="px-5 py-2.5 text-base btn-secondary whitespace-nowrap flex items-center gap-2" onclick={() => run(onShare, match)}>
              <span>Share</span>
              <i class="fas fa-link text-lg"></i>
            </button>
            <button class="px-5 py-2.5 text-base btn-danger" onclick={() => run(onDelete, match)}>Delete</button>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
