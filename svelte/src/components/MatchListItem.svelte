<script lang="ts">
  import type { Match } from "./types";
  import Icon from "./Icon.svelte";

  const GOLD_TEAM = "834";

  let {
    match,
    contributorTeams = [],
    onOpen,
    onEdit,
    onDuplicate,
    onExportPNG,
    onExportQR,
    onShare,
    onDelete,
  }: {
    match: Match;
    contributorTeams?: string[];
    onOpen: (match: Match) => void;
    onEdit: (match: Match) => void;
    onDuplicate: (match: Match) => void;
    onExportPNG: (match: Match) => void;
    onExportQR: (match: Match) => void;
    onShare: (match: Match) => void;
    onDelete: (match: Match) => void;
  } = $props();

  let actionsOpen = $state(false);
  let itemEl: HTMLDivElement | undefined = $state();

  function digitSpans(team: string) {
    const safe = team || "---";
    const kind: "gold" | "rainbow" | "none" =
      safe === GOLD_TEAM
        ? "gold"
        : contributorTeams.includes(safe)
          ? "rainbow"
          : "none";
    return safe.split("").map((ch, i) => ({
      ch,
      delay: i * 0.3,
      cls:
        kind === "gold"
          ? "special-team-digit"
          : kind === "rainbow"
            ? "rainbow-team-digit"
            : "",
    }));
  }

  function openActions(e: MouseEvent) {
    e.stopPropagation();
    actionsOpen = true;
    itemEl?.focus();
    setTimeout(() => itemEl?.scrollIntoView({ block: "center", inline: "nearest" }), 0);
  }

  function closeActions() {
    actionsOpen = false;
  }

  function onFocusOut(e: FocusEvent) {
    if (itemEl?.contains(e.relatedTarget as Node)) return;
    actionsOpen = false;
  }

  function open() {
    onOpen(match);
  }
</script>

<div
  bind:this={itemEl}
  class="match-list-item w-full min-h-[5.5rem] bg-[#141414] border border-[#1e1e1e] flex shrink-0 justify-between items-center rounded-xl px-10 max-[640px]:px-2 max-[640px]:py-3 max-[640px]:flex-row transition-all hover:bg-[#191919] hover:border-[#333] cursor-pointer"
  class:actions-open={actionsOpen}
  tabindex="0"
  role="button"
  onclick={open}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  }}
  onfocusout={onFocusOut}
>
  <div
    class="grow basis-0 text-[#e8e8e8] font-semibold text-2xl max-[640px]:text-base select-none overflow-hidden text-ellipsis whitespace-nowrap"
  >
    {match.matchName || "Untitled"}
  </div>
  <div class="w-1/2 flex justify-center items-center gap-3 sm:gap-5 md:gap-8 max-[640px]:gap-2 max-[640px]:w-auto">
    <div class="w-1/2 text-right select-none overflow-hidden text-ellipsis whitespace-nowrap">
      <span class="text-red-400 text-xl max-[640px]:text-sm">
        {#each digitSpans(match.redThree) as d, i (i)}
          {#if d.cls}<span class={d.cls} style="animation-delay:{d.delay}s">{d.ch}</span>{:else}{d.ch}{/if}
        {/each}
        {" "}
        {#each digitSpans(match.redTwo) as d, i (i)}
          {#if d.cls}<span class={d.cls} style="animation-delay:{d.delay}s">{d.ch}</span>{:else}{d.ch}{/if}
        {/each}
        {" "}
        {#each digitSpans(match.redOne) as d, i (i)}
          {#if d.cls}<span class={d.cls} style="animation-delay:{d.delay}s">{d.ch}</span>{:else}{d.ch}{/if}
        {/each}
      </span>
    </div>
    <div class="text-[#999] text-xl max-[640px]:text-sm select-none">VS</div>
    <div class="w-1/2 text-left select-none overflow-hidden text-ellipsis whitespace-nowrap">
      <span class="text-blue-400 text-xl max-[640px]:text-sm">
        {#each digitSpans(match.blueOne) as d, i (i)}
          {#if d.cls}<span class={d.cls} style="animation-delay:{d.delay}s">{d.ch}</span>{:else}{d.ch}{/if}
        {/each}
        {" "}
        {#each digitSpans(match.blueTwo) as d, i (i)}
          {#if d.cls}<span class={d.cls} style="animation-delay:{d.delay}s">{d.ch}</span>{:else}{d.ch}{/if}
        {/each}
        {" "}
        {#each digitSpans(match.blueThree) as d, i (i)}
          {#if d.cls}<span class={d.cls} style="animation-delay:{d.delay}s">{d.ch}</span>{:else}{d.ch}{/if}
        {/each}
      </span>
    </div>
  </div>
  <div class="grow basis-0 flex h-full justify-end items-center">
    {#if !actionsOpen}
      <button
        class="match-menu-btn flex flex-col w-14 sm:w-16 md:w-18 gap-2.5 items-center justify-center rounded"
        onclick={openActions}
        aria-label="Match actions"
      >
        <div class="menu-dot w-2.5 h-2.5 rounded-full bg-[#555]"></div>
        <div class="menu-dot w-2.5 h-2.5 rounded-full bg-[#555]"></div>
        <div class="menu-dot w-2.5 h-2.5 rounded-full bg-[#555]"></div>
      </button>
    {:else}
      <div
        class="flex items-center justify-center gap-3 sm:gap-4 max-[640px]:grid max-[640px]:grid-cols-3 max-[640px]:gap-1"
        onclick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button class="px-5 py-2.5 text-base btn-secondary" onclick={() => { closeActions(); onEdit(match); }}>
          Edit
        </button>
        <button class="px-5 py-2.5 text-base btn-secondary" onclick={() => { closeActions(); onDuplicate(match); }}>
          Duplicate
        </button>
        <button class="px-5 py-2.5 text-base btn-secondary whitespace-nowrap" onclick={() => { closeActions(); onExportPNG(match); }}>
          Export PNG
        </button>
        <button class="px-5 py-2.5 text-base btn-secondary whitespace-nowrap" onclick={() => { closeActions(); onExportQR(match); }}>
          Export QR
        </button>
        <button class="px-5 py-2.5 text-base btn-secondary whitespace-nowrap flex items-center gap-2" onclick={() => { closeActions(); onShare(match); }}>
          <span>Share</span>
          <Icon name="link" class="w-3.5 h-3.5" />
        </button>
        <button class="px-5 py-2.5 text-base btn-danger" onclick={() => { closeActions(); onDelete(match); }}>
          Delete
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .match-list-item.actions-open {
    align-items: flex-start;
  }
</style>
