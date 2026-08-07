<script lang="ts">
  import MatchListItem from "./MatchListItem.svelte";
  import type { Match } from "./types";

  let {
    matches,
    contributorTeams = [],
    onOpen,
    onEdit,
    onDuplicate,
    onExportPNG,
    onExportQR,
    onShare,
    onDelete,
  }: {
    matches: Match[];
    contributorTeams?: string[];
    onOpen: (match: Match) => void;
    onEdit: (match: Match) => void;
    onDuplicate: (match: Match) => void;
    onExportPNG: (match: Match) => void;
    onExportQR: (match: Match) => void;
    onShare: (match: Match) => void;
    onDelete: (match: Match) => void;
  } = $props();
</script>

<div
  class="relative w-full p-10 max-[834px]:p-3 max-[640px]:p-3 flex-1 flex flex-col gap-3 max-[640px]:gap-2 items-stretch overflow-y-auto scroll-momentum bg-[#0d0d0d]"
>
  {#if matches.length === 0}
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#999] text-xl pointer-events-none text-center whitespace-nowrap">
      Click
      <span class="not-italic text-[#999] bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1 rounded">New</span>
      to add matches
    </div>
  {:else}
    {#each matches as match (match.id)}
      <MatchListItem
        {match}
        {contributorTeams}
        {onOpen}
        {onEdit}
        {onDuplicate}
        {onExportPNG}
        {onExportQR}
        {onShare}
        {onDelete}
      />
    {/each}
  {/if}
</div>
