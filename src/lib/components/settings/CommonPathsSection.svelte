<script lang="ts">
  import { deleteCommonPath, phaseName, renameCommonPath, retagCommonPath, teamNumberKey } from "$lib/domain";
  import { boardConfig } from "$lib/stores/config.svelte";

  const paths = $derived(boardConfig.current.commonPaths);

  function rename(id: string, name: string) {
    void boardConfig.update(renameCommonPath(boardConfig.current, id, name));
  }

  function retag(id: string, input: HTMLInputElement) {
    input.value = input.value.replace(/\D/g, "").slice(0, 5);
    const tag = input.value ? teamNumberKey(input.value) : null;
    if (input.value && !tag) return;
    void boardConfig.update(retagCommonPath(boardConfig.current, id, tag));
  }

  function remove(id: string) {
    void boardConfig.update(deleteCommonPath(boardConfig.current, id));
  }
</script>

{#if paths.length}
  <ul id="common-path-library" class="flex flex-col border border-[#1e1e1e] rounded-[6px] divide-y divide-[#1e1e1e]">
    {#each paths as path (path.id)}
      <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <input
          class="flex-1 min-w-48 p-2 text-base font-semibold text-[#e8e8e8] bg-transparent rounded-[6px] border border-transparent focus:border-[#2a2a2a] outline-0"
          value={path.name}
          aria-label="Common Path name"
          oninput={(event) => rename(path.id, event.currentTarget.value)}
          onchange={(event) => rename(path.id, event.currentTarget.value.trim() || "Untitled path")}
        />
        <label class="flex items-center gap-2 text-sm text-[#999]">
          For
          <input
            class="w-28 p-2 text-base text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
            placeholder="Any robot"
            inputmode="numeric"
            maxlength="5"
            value={path.tag ?? ""}
            aria-label="Team the path is for"
            oninput={(event) => retag(path.id, event.currentTarget)}
          />
        </label>
        <span class="text-sm text-[#666]">
          {phaseName(path.phase, path.fieldYear)} · {path.fieldYear} field · {path.strokes.length} {path.strokes.length === 1 ? "Stroke" : "Strokes"}
        </span>
        <button class="ml-auto px-4 py-2 btn-danger" onclick={() => remove(path.id)}>Delete</button>
      </li>
    {/each}
  </ul>
{:else}
  <p id="common-path-empty" class="text-sm text-[#999]">No Common Paths yet. Save one from a team chip's <i class="fas fa-ellipsis-vertical"></i> menu on the whiteboard.</p>
{/if}
