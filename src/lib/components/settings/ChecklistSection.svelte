<script lang="ts">
  import { addChecklistRow, deleteChecklistRow, moveChecklistRow, renameChecklistRow, type ChecklistRowKind } from "$lib/domain";
  import { newId } from "$lib/features/runtime";
  import { boardConfig } from "$lib/stores/config.svelte";

  let draft = $state("");
  const rows = $derived(boardConfig.current.checklist);

  function add(kind: ChecklistRowKind) {
    const text = draft.trim();
    if (!text) return;
    void boardConfig.update(addChecklistRow(boardConfig.current, { id: newId(), kind, text }));
    draft = "";
  }

  function rename(id: string, text: string) {
    void boardConfig.update(renameChecklistRow(boardConfig.current, id, text));
  }

  function move(id: string, toIndex: number) {
    void boardConfig.update(moveChecklistRow(boardConfig.current, id, toIndex));
  }

  function remove(id: string) {
    void boardConfig.update(deleteChecklistRow(boardConfig.current, id));
  }
</script>

<div class="flex flex-col gap-5">
  {#if rows.length}
    <ol id="checklist-rows" class="flex flex-col border border-[#1e1e1e] rounded-[6px] divide-y divide-[#1e1e1e]">
      {#each rows as row, index (row.id)}
        <li class="flex items-center gap-2 px-3 py-2" class:bg-[#111111]={row.kind === "heading"}>
          <i class="w-6 text-center text-[#666] {row.kind === 'heading' ? 'fas fa-heading' : 'fa-regular fa-square'}" title={row.kind === "heading" ? "Heading" : "Item"}></i>
          <input
            class="flex-1 min-w-0 p-2 bg-transparent rounded-[6px] border border-transparent focus:border-[#2a2a2a] outline-0 {row.kind === 'heading' ? 'text-sm font-semibold uppercase tracking-wide text-[#e8e8e8]' : 'text-base text-[#ccc]'}"
            value={row.text}
            aria-label={row.kind === "heading" ? "Heading text" : "Item text"}
            oninput={(event) => rename(row.id, event.currentTarget.value)}
            onchange={(event) => rename(row.id, event.currentTarget.value.trim())}
          />
          <button class="row-btn btn-secondary" disabled={index === 0} aria-label="Move up" onclick={() => move(row.id, index - 1)}><i class="fas fa-arrow-up"></i></button>
          <button class="row-btn btn-secondary" disabled={index === rows.length - 1} aria-label="Move down" onclick={() => move(row.id, index + 1)}><i class="fas fa-arrow-down"></i></button>
          <button class="row-btn btn-danger" aria-label="Delete" onclick={() => remove(row.id)}><i class="fas fa-trash"></i></button>
        </li>
      {/each}
    </ol>
  {:else}
    <p id="checklist-empty" class="text-sm text-[#999]">No Checklist yet. Add what every strategy meeting should cover, grouped under headings.</p>
  {/if}

  <form class="flex flex-wrap items-center gap-3" onsubmit={(event) => { event.preventDefault(); add("item"); }}>
    <input
      id="checklist-new-row"
      placeholder="New row"
      autocomplete="off"
      class="flex-1 min-w-48 p-3 text-base text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
      bind:value={draft}
    />
    <button id="checklist-add-item-btn" type="submit" class="px-5 py-3 btn-secondary disabled:opacity-40" disabled={!draft.trim()}>Add item</button>
    <button id="checklist-add-heading-btn" type="button" class="px-5 py-3 btn-secondary disabled:opacity-40" disabled={!draft.trim()} onclick={() => add("heading")}>Add heading</button>
  </form>
</div>

<style>
  .row-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
  }
  .row-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
