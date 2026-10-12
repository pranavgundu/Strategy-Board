<script lang="ts">
  import { checklistProgress, type ChecklistRow } from "$lib/domain";

  let { checklist, ticks, open, onToggleOpen, onTick }: {
    checklist: readonly ChecklistRow[];
    ticks: readonly string[];
    open: boolean;
    onToggleOpen: () => void;
    onTick: (itemId: string) => void;
  } = $props();

  const progress = $derived(checklistProgress(checklist, ticks));
</script>

{#if open}
  <aside id="checklist-panel" class="flex flex-col w-72 lg:w-80 shrink-0 border-l border-[#1e1e1e] bg-[#111111]" aria-label="Checklist">
    <header class="flex items-center gap-3 pl-5 pr-2 h-14 shrink-0 border-b border-[#1e1e1e]">
      <span class="text-base font-semibold text-[#e8e8e8]">Checklist</span>
      <span id="checklist-progress" class="text-sm font-semibold" class:text-[#22c55e]={progress.total > 0 && progress.ticked === progress.total} class:text-[#999]={progress.ticked < progress.total || progress.total === 0}>
        {progress.ticked}/{progress.total}
      </span>
      <button class="ml-auto flex items-center justify-center size-10 text-[#999] hover:text-[#e8e8e8]" aria-label="Collapse the Checklist" onclick={onToggleOpen}>
        <i class="fas fa-chevron-right"></i>
      </button>
    </header>
    <ol class="flex-1 min-h-0 overflow-y-auto touch-pan-y py-2">
      {#each checklist as row (row.id)}
        {#if row.kind === "heading"}
          <li class="px-5 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-[#777]">{row.text}</li>
        {:else}
          {@const ticked = ticks.includes(row.id)}
          <li>
            <button class="checklist-item" class:ticked role="checkbox" aria-checked={ticked} onclick={() => onTick(row.id)}>
              <i class="{ticked ? 'fas fa-square-check text-[#22c55e]' : 'fa-regular fa-square text-[#777]'} text-lg"></i>
              <span>{row.text}</span>
            </button>
          </li>
        {/if}
      {:else}
        <li class="px-5 py-6 text-sm text-[#999]">No Checklist yet. Write one in Settings.</li>
      {/each}
    </ol>
  </aside>
{:else}
  <button id="checklist-tab" class="flex flex-col items-center gap-3 w-10 shrink-0 py-4 border-l border-[#1e1e1e] bg-[#111111] text-[#999] hover:text-[#e8e8e8]" aria-label="Open the Checklist" onclick={onToggleOpen}>
    <i class="fas fa-list-check"></i>
    <span class="checklist-tab-label">Checklist {progress.ticked}/{progress.total}</span>
  </button>
{/if}

<style>
  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
    padding: 0.6rem 1.25rem;
    border: none;
    background: transparent;
    color: #e8e8e8;
    font-family: inherit;
    font-size: 1rem;
    text-align: left;
    cursor: pointer;
  }
  .checklist-item:hover { background: #181818; }
  .checklist-item.ticked span { color: #777; text-decoration: line-through; }
  .checklist-item i { margin-top: 0.15rem; }
  .checklist-tab-label {
    writing-mode: vertical-rl;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
</style>
