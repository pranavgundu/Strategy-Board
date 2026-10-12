<script lang="ts">
  import { phaseName, STATION_NAMES, STATIONS, type CommonPath, type CommonPathChoice, type Lineup, type StationKey } from "$lib/domain";
  import Modal from "./Modal.svelte";

  let { open, choices, lineup, fieldYear, onApply, onClose }: {
    open: boolean;
    choices: CommonPathChoice[];
    lineup: Lineup;
    fieldYear: number;
    onApply: (path: CommonPath, station: StationKey) => void;
    onClose: () => void;
  } = $props();

  let targets = $state<Record<string, StationKey | "">>({});
  const occupied = $derived(STATIONS.filter((station) => lineup[station].trim()));

  $effect(() => {
    if (open) targets = Object.fromEntries(choices.map(({ path, station }) => [path.id, station ?? ""]));
  });
</script>

<Modal
  {open}
  id="apply-path-container"
  title="Apply a Common Path"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-11/12 md:w-3/4 lg:w-2/3 max-w-3xl max-h-[85vh] bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
  {onClose}
>
  <div class="flex items-center justify-between gap-4 px-6 py-4 bg-[#111111] border-b border-[#1e1e1e]">
    <span class="text-lg font-semibold text-[#e8e8e8]">Apply a Common Path</span>
    <button class="flex items-center justify-center size-10 btn-secondary" aria-label="Close" onclick={onClose}><i class="fas fa-times"></i></button>
  </div>
  <ul id="apply-path-list" class="flex-1 min-h-0 overflow-y-auto touch-pan-y divide-y divide-[#1e1e1e]">
    {#each choices as { path } (path.id)}
      <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
        <div class="flex-1 min-w-48">
          <div class="text-base font-semibold text-[#e8e8e8]">{path.name}</div>
          <div class="text-sm text-[#999]">
            {path.tag ? `For ${path.tag}` : "Any robot"} · {phaseName(path.phase, fieldYear)} · {path.strokes.length} {path.strokes.length === 1 ? "Stroke" : "Strokes"}
          </div>
        </div>
        <select
          class="p-3 text-base text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
          aria-label="Station to apply {path.name} to"
          bind:value={targets[path.id]}
        >
          <option value="" disabled>Choose a Station</option>
          {#each occupied as station (station)}
            <option value={station}>{STATION_NAMES[station]} · {lineup[station]}</option>
          {/each}
        </select>
        <button
          class="px-5 py-3 btn-secondary disabled:opacity-40"
          disabled={!targets[path.id]}
          onclick={() => { const station = targets[path.id]; if (station) onApply(path, station); }}
        >
          Apply
        </button>
      </li>
    {:else}
      <li class="px-6 py-10 text-center text-[#999]">No Common Paths for the {fieldYear} field yet. Save one from a team chip's <i class="fas fa-ellipsis-vertical"></i> menu.</li>
    {/each}
  </ul>
</Modal>
