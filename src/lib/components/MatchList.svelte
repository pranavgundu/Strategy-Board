<script lang="ts">
  import type { Match } from "./types";
  let { matches, onOpen, onEdit, onDuplicate, onExportPng, onExportQr, onShare, onDelete }: { matches: Match[]; onOpen: (match: Match) => void; onEdit: (match: Match) => void; onDuplicate: (match: Match) => void; onExportPng: (match: Match) => void; onExportQr: (match: Match) => void; onShare: (match: Match) => void; onDelete: (match: Match) => void } = $props();
  let menuId = $state<string | null>(null);
  const alliance = (match: Match, colour: "red" | "blue") => colour === "red" ? [match.redOne, match.redTwo, match.redThree] : [match.blueOne, match.blueTwo, match.blueThree];
</script>

<main class="match-list" aria-label="Saved matches">
  {#if matches.length === 0}
    <section class="empty-state">
      <div class="empty-illustration" aria-hidden="true"><span></span><span></span><span></span></div>
      <p class="eyebrow">Your strategy starts here</p>
      <h1>Plan your next match</h1>
      <p>Create a match or import a schedule from The Blue Alliance, then map every phase on the field.</p>
    </section>
  {:else}
    <header class="match-list-header">
      <div><p class="eyebrow">Saved workspace</p><h1>Match plans</h1></div>
      <span class="match-count">{matches.length} {matches.length === 1 ? "match" : "matches"}</span>
    </header>
    {#each matches as match (match.id)}
      <article class="match-card">
        <button class="match-summary" onclick={() => onOpen(match)} aria-label={`Open ${match.matchName || "untitled match"}`}>
          <span class="match-identity">
            <span class="match-source">{match.tbaMatchKey ? "TBA match" : "Strategy plan"}</span>
            <strong>{match.matchName || "Untitled match"}</strong>
            {#if match.tbaMatchKey}<small>{match.tbaMatchKey}</small>{/if}
          </span>
          <span class="alliance-matchup">
            <span class="alliance-block red-alliance">
              <span class="alliance-label">Red</span>
              <span class="team-row">{#each alliance(match, "red") as team}<span class:team-empty={!team} class="team-number">{team || "—"}</span>{/each}</span>
            </span>
            <span class="versus">vs</span>
            <span class="alliance-block blue-alliance">
              <span class="alliance-label">Blue</span>
              <span class="team-row">{#each alliance(match, "blue") as team}<span class:team-empty={!team} class="team-number">{team || "—"}</span>{/each}</span>
            </span>
          </span>
          <span class="open-match" aria-hidden="true">Open <span>→</span></span>
        </button>
        <div class="match-menu">
          <button class="button icon-button" onclick={() => menuId = menuId === match.id ? null : match.id} aria-expanded={menuId === match.id} aria-label={`Actions for ${match.matchName || "match"}`}>⋯</button>
          {#if menuId === match.id}
            <div class="action-menu" role="menu">
              <button onclick={() => { menuId = null; onEdit(match); }}>Edit</button><button onclick={() => { menuId = null; onDuplicate(match); }}>Duplicate</button>
              <button onclick={() => { menuId = null; onExportPng(match); }}>Export PNG</button><button onclick={() => { menuId = null; onExportQr(match); }}>Export QR</button>
              <button onclick={() => { menuId = null; onShare(match); }}>Share</button><button class="danger-action" onclick={() => { menuId = null; onDelete(match); }}>Delete</button>
            </div>
          {/if}
        </div>
      </article>
    {/each}
  {/if}
</main>
